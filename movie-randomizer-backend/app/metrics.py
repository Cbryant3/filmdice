"""
Anonymous usage metrics and app-health numbers for the public /stats page.

Two sources feed the page:
  * daily_metrics: per-day counters bumped as things happen (rolls, swipes,
    For You results, filter usage, trailer plays...). No user IDs are stored,
    so these survive data deletion and can be published.
  * user_movie_interactions: live aggregates (user counts, activity, totals,
    most-liked movies/genres). Only aggregate numbers ever leave this module.
"""
from __future__ import annotations

import asyncio
import re
import time
from collections import Counter, deque
from datetime import date, datetime, timedelta, timezone

from sqlalchemy import func, select, distinct, case, update
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app import tmdb_client
from app.models import DailyMetric, UserMovieInteraction

# ---------------------------------------------------------------------------
# Counters
# ---------------------------------------------------------------------------

# Events the frontend may report through POST /events.
CLIENT_EVENTS = {"trailer_play", "watch_link"}

FILTER_FIELDS = {
    "genre": lambda f: bool(f.genre_ids),
    "decade": lambda f: bool(f.decades or f.year_min or f.year_max),
    "rating": lambda f: f.rating_min is not None or f.rating_max is not None,
    "runtime": lambda f: f.runtime_min is not None or f.runtime_max is not None,
    "content_rating": lambda f: bool(f.content_rating_include or f.content_rating_exclude),
    "language": lambda f: bool(f.language),
    "region": lambda f: bool(f.region),
    "streaming_only": lambda f: bool(f.must_be_streaming),
    "sort": lambda f: bool(f.sort_by and f.sort_by != "popularity.desc"),
}


def _today() -> date:
    return datetime.now(timezone.utc).date()


async def bump(db: AsyncSession, counts: dict[str, int]) -> None:
    """Add to today's counters. Joins the caller's transaction (caller commits)."""
    today = _today()
    for metric, n in counts.items():
        if not n:
            continue
        stmt = pg_insert(DailyMetric).values(day=today, metric=metric, count=n)
        stmt = stmt.on_conflict_do_update(
            index_elements=[DailyMetric.day, DailyMetric.metric],
            set_={"count": DailyMetric.count + n},
        )
        await db.execute(stmt)


async def unbump(db: AsyncSession, counts: dict[str, int]) -> None:
    """Subtract from today's counters (never below zero, never creates rows).

    Used by undo. If the original swipe was counted on an earlier day, today's
    numbers are left alone.
    """
    today = _today()
    for metric, n in counts.items():
        if not n:
            continue
        await db.execute(
            update(DailyMetric)
            .where(DailyMetric.day == today, DailyMetric.metric == metric)
            .values(count=func.greatest(DailyMetric.count - n, 0))
        )


def filter_counts(filters) -> dict[str, int]:
    used = {f"filter_{name}": 1 for name, test in FILTER_FIELDS.items() if test(filters)}
    if used:
        used["rolls_filtered"] = 1
    return used


def swipe_counts(status: str | None, skip: bool | None, context: str | None) -> dict[str, int]:
    if context not in ("swipe", "for_you"):
        return {}
    if status == "liked":
        kind = "like"
    elif status == "watched":
        kind = "watched"
    elif skip:
        kind = "skip"
    else:
        return {}
    return swipe_counts_for(kind, context)


def swipe_counts_for(kind: str, context: str | None) -> dict[str, int]:
    """Counter names for one swipe of `kind` ("like" | "skip" | "watched")."""
    counts = {f"swipe_{kind}": 1}
    if context == "for_you":
        counts[f"for_you_{kind}"] = 1
    return counts


# ---------------------------------------------------------------------------
# Health (in memory, resets when the server restarts or wakes from sleep)
# ---------------------------------------------------------------------------

STARTED_AT = datetime.now(timezone.utc)
_latencies_ms: deque[float] = deque(maxlen=2000)
_requests = 0
_server_errors = 0
_UNTIMED = {"/", "/health", "/stats", "/docs", "/openapi.json"}


def record_request(path: str, status: int, elapsed_ms: float) -> None:
    global _requests, _server_errors
    if path in _UNTIMED:
        return
    _requests += 1
    if status >= 500:
        _server_errors += 1
    _latencies_ms.append(elapsed_ms)


def _percentile(sorted_vals: list[float], pct: float) -> float | None:
    if not sorted_vals:
        return None
    k = min(len(sorted_vals) - 1, max(0, round(pct / 100 * (len(sorted_vals) - 1))))
    return round(sorted_vals[k], 1)


def health_snapshot() -> dict:
    vals = sorted(_latencies_ms)
    return {
        "up_since": STARTED_AT.isoformat(),
        "uptime_seconds": int((datetime.now(timezone.utc) - STARTED_AT).total_seconds()),
        "requests": _requests,
        "server_errors": _server_errors,
        "error_rate": round(_server_errors / _requests, 4) if _requests else None,
        "latency_ms_p50": _percentile(vals, 50),
        "latency_ms_p95": _percentile(vals, 95),
        "latency_samples": len(vals),
        "tmdb_calls": tmdb_client.call_count,
    }


# ---------------------------------------------------------------------------
# Stats endpoint payload (cached briefly; it runs several aggregate queries)
# ---------------------------------------------------------------------------

CACHE_SECONDS = 60
SERIES_DAYS = 30
MIN_LIKES_FOR_TOP_MOVIE = 2  # never surface a movie only one person liked
_cache: tuple[float, dict] | None = None
_cache_lock = asyncio.Lock()
_title_cache: dict[int, dict] = {}

# Google account IDs are all digits; guest IDs are browser-generated UUIDs.
_GOOGLE_ID = re.compile(r"^\d+$")


def _rate(num: int, den: int) -> float | None:
    return round(num / den, 4) if den else None


async def _movie_brief(movie_id: int) -> dict:
    if movie_id not in _title_cache:
        try:
            d = await tmdb_client.get_movie(movie_id)
            _title_cache[movie_id] = {
                "id": movie_id,
                "title": d.get("title") or "Unknown title",
                "year": int(d["release_date"][:4]) if (d.get("release_date") or "")[:4].isdigit() else None,
                "poster_url": tmdb_client.poster_url(d.get("poster_path")),
            }
        except Exception:
            return {"id": movie_id, "title": None, "year": None, "poster_url": None}
    return _title_cache[movie_id]


async def compute_stats(db: AsyncSession) -> dict:
    I = UserMovieInteraction
    now = datetime.now(timezone.utc)
    last_seen = func.greatest(I.updated_at, func.coalesce(I.last_surfaced_at, I.updated_at))

    # --- Users & activity (live) ---
    user_ids = (await db.execute(select(distinct(I.user_id)))).scalars().all()
    total_users = len(user_ids)
    signed_in = sum(1 for u in user_ids if _GOOGLE_ID.match(u))

    async def active_since(days: int) -> int:
        return (await db.execute(
            select(func.count(distinct(I.user_id))).where(last_seen >= now - timedelta(days=days))
        )).scalar_one()

    active_7d, active_30d = await active_since(7), await active_since(30)

    per_user_days = (
        select(I.user_id)
        .group_by(I.user_id)
        .having(func.count(distinct(func.date(I.created_at))) >= 2)
        .subquery()
    )
    returning = (await db.execute(select(func.count()).select_from(per_user_days))).scalar_one()

    # --- Swipe totals (live) ---
    row = (await db.execute(select(
        func.count(),
        func.sum(case((I.status == "liked", 1), else_=0)),
        func.sum(case((I.status == "watched", 1), else_=0)),
        func.sum(case((I.skip.is_(True), 1), else_=0)),
    ))).one()
    movies_served, likes, watched, skips = (int(x or 0) for x in row)
    swipes = likes + watched + skips

    # --- Daily counters ---
    first_day = (await db.execute(select(func.min(DailyMetric.day)))).scalar_one()
    totals = {m: int(c) for m, c in (await db.execute(
        select(DailyMetric.metric, func.sum(DailyMetric.count)).group_by(DailyMetric.metric)
    )).all()}

    start = now.date() - timedelta(days=SERIES_DAYS - 1)
    daily_rows = (await db.execute(
        select(DailyMetric.day, DailyMetric.metric, DailyMetric.count).where(DailyMetric.day >= start)
    )).all()
    by_day: dict[date, Counter] = {}
    for d, m, c in daily_rows:
        by_day.setdefault(d, Counter())[m] += int(c)
    series = []
    for i in range(SERIES_DAYS):
        d = start + timedelta(days=i)
        c = by_day.get(d, Counter())
        series.append({
            "day": d.isoformat(),
            "rolls": c["rolls"],
            "swipes": c["swipe_like"] + c["swipe_skip"] + c["swipe_watched"],
            "likes": c["swipe_like"],
            "new_users": c["new_users"],
        })

    def t(name: str) -> int:
        return totals.get(name, 0)

    fy_swipes = t("for_you_like") + t("for_you_skip") + t("for_you_watched")
    all_swipes = t("swipe_like") + t("swipe_skip") + t("swipe_watched")
    random_swipes = all_swipes - fy_swipes
    random_likes = t("swipe_like") - t("for_you_like")
    roll_requests = t("roll_requests")

    # --- Taste insights (live, aggregate only) ---
    liked_rows = (await db.execute(
        select(I.tmdb_movie_id, I.genre_ids, I.release_year).where(I.status == "liked")
    )).all()
    genre_counts: Counter = Counter()
    decade_counts: Counter = Counter()
    movie_counts: Counter = Counter()
    for mid, gids, year in liked_rows:
        movie_counts[mid] += 1
        for g in gids or []:
            genre_counts[int(g)] += 1
        if year:
            decade_counts[(int(year) // 10) * 10] += 1

    try:
        genre_names = {g["id"]: g["name"] for g in (await tmdb_client.get_genres()).get("genres", [])}
    except Exception:
        genre_names = {}

    top_movie_ids = [m for m, c in movie_counts.most_common(10) if c >= MIN_LIKES_FOR_TOP_MOVIE][:5]
    briefs = await asyncio.gather(*(_movie_brief(m) for m in top_movie_ids))
    top_movies = [{**b, "likes": movie_counts[b["id"]]} for b in briefs]

    return {
        "generated_at": now.isoformat(),
        "tracking_since": first_day.isoformat() if first_day else None,
        "users": {
            "total": total_users,
            "signed_in": signed_in,
            "guests": total_users - signed_in,
            "active_7d": active_7d,
            "active_30d": active_30d,
            "returning": returning,
            "avg_swipes_per_user": round(swipes / total_users, 1) if total_users else None,
        },
        "swipes": {
            "movies_served": movies_served,
            "total": swipes,
            "likes": likes,
            "skips": skips,
            "watched": watched,
            "like_rate": _rate(likes, swipes),
        },
        "for_you": {
            "shown": t("for_you_shown"),
            "swipes": fy_swipes,
            "likes": t("for_you_like"),
            "like_rate": _rate(t("for_you_like"), fy_swipes),
            "random_like_rate": _rate(random_likes, random_swipes),
        },
        "engine": {
            "roll_requests": roll_requests,
            "no_results_rate": _rate(t("no_results"), roll_requests),
            "avg_rerolls_per_pick": round(t("reroll_attempts") / t("rolls"), 2) if t("rolls") else None,
        },
        "engagement": {
            "undos": t("undo"),
            "trailer_plays": t("trailer_play"),
            "watch_link_taps": t("watch_link"),
        },
        "filters": {
            "rolls_with_filters_rate": _rate(t("rolls_filtered"), roll_requests),
            "usage": sorted(
                ({"filter": name, "rolls": t(f"filter_{name}")} for name in FILTER_FIELDS),
                key=lambda x: -x["rolls"],
            ),
        },
        "taste": {
            "top_genres": [
                {"genre": genre_names.get(g, str(g)), "likes": c} for g, c in genre_counts.most_common(8)
            ],
            "top_decades": [{"decade": d, "likes": c} for d, c in decade_counts.most_common(6)],
            "top_movies": top_movies,
        },
        "series": series,
        "health": health_snapshot(),
    }


async def cached_stats(db: AsyncSession) -> dict:
    global _cache
    async with _cache_lock:
        if _cache and time.monotonic() - _cache[0] < CACHE_SECONDS:
            data = dict(_cache[1])
        else:
            data = await compute_stats(db)
            _cache = (time.monotonic(), data)
    # Health numbers are cheap; always serve them fresh.
    return {**data, "health": health_snapshot()}
