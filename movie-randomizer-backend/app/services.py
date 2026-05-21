from __future__ import annotations

WEIGHTS: dict[str, float] = {
    "liked":   3.0,
    "watched": 1.0,
    "dropped": -1.0,
}
SKIP_WEIGHT = -0.5


def compute_preference_scores(
    interactions: list,
) -> tuple[dict[int, float], dict[int, float]]:
    """
    Returns (genre_scores, decade_scores) tallied from a user's interaction history.

    genre_scores  — {tmdb_genre_id: cumulative_score}
    decade_scores — {decade_int: cumulative_score}  (e.g. 1990 = the 1990s)
    """
    genre_scores: dict[int, float] = {}
    decade_scores: dict[int, float] = {}

    for row in interactions:
        if not row.genre_ids:
            continue

        w = SKIP_WEIGHT if row.skip else WEIGHTS.get(row.status, 0.0)
        if w == 0.0:
            continue

        for gid in row.genre_ids:
            genre_scores[gid] = genre_scores.get(gid, 0.0) + w

        if row.release_year:
            decade = (row.release_year // 10) * 10
            decade_scores[decade] = decade_scores.get(decade, 0.0) + w

    return genre_scores, decade_scores
