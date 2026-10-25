"""The public /stats endpoint and the anonymous counters behind it."""
from conftest import roll, swipe, fresh_stats


def test_empty_stats_are_well_formed(client):
    s = fresh_stats(client)
    assert s["users"]["total"] == 0
    assert s["swipes"]["like_rate"] is None
    assert len(s["series"]) == 30
    assert set(s) >= {"users", "swipes", "for_you", "engine", "engagement", "filters", "taste", "series", "health"}


def test_users_and_swipe_totals(client):
    users = ["guest-1", "guest-2", "112233445566778899001"]  # last one looks like a Google ID
    for u in users:
        for kind in ("like", "like", "skip", "watched"):
            m = roll(client, u).json()
            swipe(client, u, m["id"], kind)
    s = fresh_stats(client)
    assert s["users"]["total"] == 3
    assert s["users"]["signed_in"] == 1 and s["users"]["guests"] == 2
    assert s["users"]["active_7d"] == 3
    assert s["swipes"] == {**s["swipes"], "likes": 6, "skips": 3, "watched": 3, "total": 12}
    assert s["swipes"]["like_rate"] == 0.5
    assert s["users"]["avg_swipes_per_user"] == 4.0
    today = s["series"][-1]
    assert today["rolls"] == 12 and today["swipes"] == 12 and today["new_users"] == 3


def test_returning_users(client, run_sql):
    swipe(client, "back", 1, "like")
    swipe(client, "back", 2, "like")
    run_sql("UPDATE user_movie_interactions SET created_at = now() - interval '3 days' "
            "WHERE user_id = 'back' AND tmdb_movie_id = 1")
    swipe(client, "once", 1, "like")
    assert fresh_stats(client)["users"]["returning"] == 1


def test_for_you_vs_random_like_rate(client):
    swipe(client, "u", 1, "like", context="for_you")
    swipe(client, "u", 2, "skip", context="for_you")
    swipe(client, "u", 3, "like")
    swipe(client, "u", 4, "skip")
    swipe(client, "u", 5, "skip")
    swipe(client, "u", 6, "skip")
    fy = fresh_stats(client)["for_you"]
    assert fy["like_rate"] == 0.5
    assert fy["random_like_rate"] == 0.25


def test_non_swipe_edits_are_not_counted(client):
    client.post("/interactions", json={"user_id": "w", "tmdb_movie_id": 1, "status": "watched"})
    assert fresh_stats(client)["series"][-1]["swipes"] == 0


def test_filter_usage_and_no_results(client):
    roll(client, filters={"genre_ids": [18]})
    roll(client, filters={"must_be_streaming": True})
    roll(client)
    roll(client, filters={"genre_ids": [99999]})  # nothing matches
    s = fresh_stats(client)
    usage = {f["filter"]: f["rolls"] for f in s["filters"]["usage"]}
    assert usage["genre"] == 2 and usage["streaming_only"] == 1
    assert s["engine"]["roll_requests"] == 4
    assert s["engine"]["no_results_rate"] == 0.25
    assert s["filters"]["rolls_with_filters_rate"] == 0.75


def test_events_only_accept_known_names(client):
    assert client.post("/events", json={"name": "trailer_play"}).status_code == 204
    assert client.post("/events", json={"name": "watch_link"}).status_code == 204
    assert client.post("/events", json={"name": "made_up"}).status_code == 204
    e = fresh_stats(client)["engagement"]
    assert e["trailer_plays"] == 1 and e["watch_link_taps"] == 1


def test_top_movies_need_two_people(client):
    swipe(client, "a", 10, "like")
    swipe(client, "b", 10, "like")
    swipe(client, "a", 20, "like")  # only one person: must stay hidden
    top = fresh_stats(client)["taste"]["top_movies"]
    assert [m["id"] for m in top] == [10]
    assert top[0]["title"] == "Movie 10" and top[0]["likes"] == 2


def test_taste_genres_and_decades(client):
    for _ in range(4):
        m = roll(client, "t", filters={"genre_ids": [27]}).json()
        swipe(client, "t", m["id"], "like")
    taste = fresh_stats(client)["taste"]
    assert taste["top_genres"][0] == {"genre": "Horror", "likes": 4}
    assert sum(d["likes"] for d in taste["top_decades"]) == 4


def test_stats_are_cached_but_health_is_fresh(client):
    fresh_stats(client)
    swipe(client, "late", 1, "like")
    s = client.get("/stats").json()  # within the 60s cache window
    assert s["users"]["total"] == 0
    assert s["health"]["requests"] >= 1
