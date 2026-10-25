"""Delete my data and the one-year inactivity cleanup."""
import asyncio

from conftest import roll, swipe, fresh_stats
from app.main import purge_inactive_users


def test_delete_my_data_erases_everything_for_that_user(client):
    for _ in range(3):
        m = roll(client, "leaver").json()
        swipe(client, "leaver", m["id"], "like")
    client.get("/users/leaver/preferences")  # builds the taste cache
    swipe(client, "stayer", 1, "like")

    assert client.delete("/users/leaver").status_code == 204
    assert client.get("/users/leaver/history").json() == []
    assert client.get("/users/leaver/preferences").json()["total_interactions"] == 0
    assert len(client.get("/users/stayer/history").json()) == 1  # others untouched


def test_delete_keeps_anonymous_counters(client):
    m = roll(client, "x").json()
    swipe(client, "x", m["id"], "like")
    client.delete("/users/x")
    s = fresh_stats(client)
    assert s["users"]["total"] == 0          # the person is gone
    assert s["series"][-1]["likes"] == 1      # the anonymous daily count remains


def test_purge_removes_only_inactive_users(client, run_sql):
    swipe(client, "old", 1, "like")
    swipe(client, "old", 2, "skip")
    swipe(client, "recent", 1, "like")
    swipe(client, "mixed", 1, "like")
    swipe(client, "mixed", 2, "like")
    run_sql("UPDATE user_movie_interactions SET updated_at = now() - interval '400 days', "
            "last_surfaced_at = now() - interval '400 days' WHERE user_id = 'old'")
    run_sql("UPDATE user_movie_interactions SET updated_at = now() - interval '400 days' "
            "WHERE user_id = 'mixed' AND tmdb_movie_id = 1")
    run_sql("INSERT INTO user_preference_cache (user_id, liked_count, total_interactions, updated_at) "
            "VALUES ('orphan', 0, 0, now() - interval '400 days')")

    removed = client.portal.call(purge_inactive_users)
    assert removed == 1
    users = {r[0] for r in run_sql("SELECT DISTINCT user_id FROM user_movie_interactions")}
    assert users == {"recent", "mixed"}
    assert run_sql("SELECT user_id FROM user_preference_cache WHERE user_id = 'orphan'") == []
