"""Likes, skips, watched, the Liked/Watched lists, removing, and undo."""
from conftest import roll, swipe, fresh_stats


def test_like_skip_and_watched_are_saved(client):
    a, b, c = (roll(client, "s").json()["id"] for _ in range(3))
    swipe(client, "s", a, "like")
    swipe(client, "s", b, "skip")
    swipe(client, "s", c, "watched")
    liked = client.get("/users/s/history?status=liked").json()
    watched = client.get("/users/s/history?status=watched").json()
    assert [x["tmdb_movie_id"] for x in liked] == [a]
    assert [x["tmdb_movie_id"] for x in watched] == [c]
    skipped = [x for x in client.get("/users/s/history").json() if x["skip"]]
    assert [x["tmdb_movie_id"] for x in skipped] == [b]


def test_lists_are_private_per_user(client):
    swipe(client, "alice", 1, "like")
    assert client.get("/users/bob/history?status=liked").json() == []


def test_remove_from_list(client):
    swipe(client, "r", 5, "like")
    assert client.delete("/interactions/r/5").status_code == 204
    assert client.get("/users/r/history?status=liked").json() == []


def test_undo_like_restores_unswiped_state(client):
    mid = roll(client, "un").json()["id"]
    swipe(client, "un", mid, "like")
    r = client.post("/interactions/undo", json={"user_id": "un", "tmdb_movie_id": mid, "kind": "like", "context": "swipe"})
    assert r.json() == {"ok": True, "undone": True}
    row = client.get("/users/un/history").json()[0]
    assert row["status"] == "unseen" and row["skip"] is False
    assert client.get("/users/un/history?status=liked").json() == []


def test_undo_skip(client):
    mid = roll(client, "un2").json()["id"]
    swipe(client, "un2", mid, "skip")
    client.post("/interactions/undo", json={"user_id": "un2", "tmdb_movie_id": mid, "kind": "skip", "context": "swipe"})
    assert client.get("/users/un2/history").json()[0]["skip"] is False


def test_undo_corrects_stats_and_counts_the_undo(client):
    mid = roll(client, "u3").json()["id"]
    swipe(client, "u3", mid, "like", context="for_you")
    s = fresh_stats(client)
    assert s["for_you"]["likes"] == 1 and s["series"][-1]["likes"] == 1
    client.post("/interactions/undo", json={"user_id": "u3", "tmdb_movie_id": mid, "kind": "like", "context": "for_you"})
    s = fresh_stats(client)
    assert s["for_you"]["likes"] == 0
    assert s["series"][-1]["likes"] == 0
    assert s["engagement"]["undos"] == 1


def test_undo_of_unknown_movie_is_harmless(client):
    r = client.post("/interactions/undo", json={"user_id": "ghost", "tmdb_movie_id": 1, "kind": "skip"})
    assert r.json() == {"ok": True, "undone": False}
    assert fresh_stats(client)["engagement"]["undos"] == 0


def test_undo_never_makes_counters_negative(client, run_sql):
    mid = roll(client, "u4").json()["id"]
    swipe(client, "u4", mid, "like")
    run_sql("DELETE FROM daily_metrics WHERE metric = 'swipe_like'")  # e.g. swiped yesterday
    client.post("/interactions/undo", json={"user_id": "u4", "tmdb_movie_id": mid, "kind": "like", "context": "swipe"})
    rows = run_sql("SELECT count FROM daily_metrics WHERE count < 0")
    assert rows == []


def test_swipe_validation(client):
    bad = client.post("/interactions", json={"user_id": "v", "tmdb_movie_id": 1, "status": "loved"})
    assert bad.status_code == 422
    bad = client.post("/interactions/undo", json={"user_id": "v", "tmdb_movie_id": 1, "kind": "maybe"})
    assert bad.status_code == 422
