"""
Small in-memory, per-visitor rate limiter (no extra services needed).

Limits are generous: a fast swiper never comes close. They exist to stop
scripts from hammering the API, burning the TMDB quota, spamming the delete
endpoint, or inflating the public stats.

State lives in this process's memory, so it resets on restart. That's fine
for a single small instance; a multi-instance deploy would need Redis.
"""
from __future__ import annotations

import re
import time
from collections import deque
from dataclasses import dataclass

from starlette.requests import Request
from starlette.responses import JSONResponse


@dataclass(frozen=True)
class Rule:
    name: str
    method: str          # "*" for any
    path: re.Pattern
    limit: int           # requests allowed...
    window: float        # ...per this many seconds


RULES: list[Rule] = [
    Rule("delete_user", "DELETE", re.compile(r"^/users/[^/]+$"), 10, 3600),
    Rule("events", "POST", re.compile(r"^/events$"), 60, 60),
    Rule("rolls", "POST", re.compile(r"^/(random-movie|for-you)$"), 90, 60),
    Rule("interactions", "*", re.compile(r"^/interactions"), 120, 60),
    Rule("stats", "GET", re.compile(r"^/stats$"), 30, 60),
    Rule("any", "*", re.compile(r"^/"), 300, 60),  # overall ceiling per visitor
]

_hits: dict[tuple[str, str], deque[float]] = {}
_last_sweep = time.monotonic()


def client_ip(request: Request) -> str:
    """Best-effort visitor IP behind Render's proxies (Cloudflare in front)."""
    h = request.headers
    for name in ("true-client-ip", "cf-connecting-ip"):
        if h.get(name):
            return h[name].strip()
    xff = h.get("x-forwarded-for")
    if xff:
        return xff.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def _sweep(now: float) -> None:
    """Drop idle buckets every few minutes so memory stays small."""
    global _last_sweep
    if now - _last_sweep < 300:
        return
    _last_sweep = now
    longest = max(r.window for r in RULES)
    for key in [k for k, q in _hits.items() if not q or now - q[-1] > longest]:
        del _hits[key]


def check(request: Request) -> JSONResponse | None:
    """Return a 429 response if this request is over a limit, else None."""
    if request.method == "OPTIONS":  # CORS preflight
        return None
    now = time.monotonic()
    _sweep(now)
    ip = client_ip(request)
    path = request.url.path
    for rule in RULES:
        if rule.method not in ("*", request.method) or not rule.path.match(path):
            continue
        q = _hits.setdefault((rule.name, ip), deque())
        while q and now - q[0] > rule.window:
            q.popleft()
        if len(q) >= rule.limit:
            retry = max(1, int(rule.window - (now - q[0])) + 1)
            return JSONResponse(
                {"detail": "Too many requests. Please slow down and try again shortly."},
                status_code=429,
                headers={"Retry-After": str(retry)},
            )
        q.append(now)
    return None


def reset() -> None:
    """Clear all counters (used by tests)."""
    _hits.clear()
