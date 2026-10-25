"""Rolling movies, filters, repeat suppression, movie details, For You."""
from conftest import roll, swipe


def test_health_and_root(client):
    assert client.get("/health").json() == {"ok": True}
    assert client.get("/").status_code == 200


def test_roll_returns_a_complete_movie(client):
    r = roll(client)
    assert r.status_code == 200
    m = r.json()
    assert m["id"] and m["title"].startswith("Movie ")
    assert m["poster_url"].startswith("https://image.tmdb.org/")
    assert m["trailer_url"].startswith("https://www.youtube.com/watch?v=")
    assert m["where_to_watch"]["flatrate"][0]["provider_name"] == "Netflix"
    assert m["content_rating"] == "PG-13"
    assert m["is_for_you"] is False
    assert m["release_year"] and m["genre_ids"]


def test_roll_records_the_movie_as_shown(client):
    m = roll(client, "viewer").json()
    hist = client.get("/users/viewer/history").json()
    assert [h["tmdb_movie_id"] for h in hist] == [m["id"]]
    assert hist[0]["status"] == "unseen" and hist[0]["skip"] is False


def test_filters_are_sent_to_tmdb(client, fake_tmdb):
    roll(client, filters={
        "genre_ids": [18, 35], "decades": [1990, 2000], "rating_min": 6.5, "rating_max": 9,
        "runtime_max": 120, "language": "en", "region": "GB", "must_be_streaming": True,
        "sort_by": "vote_average.desc",
    })
    q = fake_tmdb.discover_calls[0]
    assert q["with_genres"] == "18|35"
    assert q["primary_release_date.gte"] == "1990-01-01"
    assert q["primary_release_date.lte"] == "2009-12-31"
    assert q["vote_average.gte"] == "6.5" and q["vote_average.lte"] == "9.0"
    assert q["with_runtime.lte"] == "120"
    assert q["with_original_language"] == "en"
    assert q["region"] == "GB" and q["watch_region"] == "GB"
    assert q["with_watch_monetization_types"] == "flatrate"
    assert q["sort_by"] == "vote_average.desc"
    assert q["include_adult"] == "false"


def test_genre_filter_only_returns_matching_movies(client):
    for _ in range(5):
        m = roll(client, filters={"genre_ids": [27]}).json()
        assert 27 in m["genre_ids"]


def test_no_matching_movies_returns_404(client):
    r = roll(client, filters={"genre_ids": [99999]})
    assert r.status_code == 404


def test_invalid_filter_ranges_are_rejected(client):
    assert roll(client, filters={"rating_min": 8, "rating_max": 3}).status_code == 422
    assert roll(client, filters={"year_min": 2010, "year_max": 1990}).status_code == 422


def test_liked_movies_are_never_rolled_again(client, fake_tmdb, run_sql):
    fake_tmdb.reset(count=1)
    m = roll(client, "solo").json()
    swipe(client, "solo", m["id"], "like")
    # Even long after the 30-day repeat window, a liked movie stays out.
    run_sql("UPDATE user_movie_interactions SET last_surfaced_at = now() - interval '60 days'")
    assert roll(client, "solo").status_code == 404


def test_unswiped_movies_can_return_after_30_days(client, fake_tmdb, run_sql):
    fake_tmdb.reset(count=1)
    roll(client, "later")
    run_sql("UPDATE user_movie_interactions SET last_surfaced_at = now() - interval '31 days'")
    assert roll(client, "later").status_code == 200


def test_watched_movies_are_hidden_for_90_days(client, fake_tmdb, run_sql):
    fake_tmdb.reset(count=1)
    m = roll(client, "w").json()
    swipe(client, "w", m["id"], "watched")
    run_sql("UPDATE user_movie_interactions SET last_surfaced_at = now() - interval '60 days'")
    assert roll(client, "w").status_code == 404
    run_sql("UPDATE user_movie_interactions SET last_surfaced_at = now() - interval '91 days'")
    assert roll(client, "w").status_code == 200


def test_recently_shown_movies_are_suppressed(client, fake_tmdb):
    fake_tmdb.reset(count=1)
    assert roll(client, "u").status_code == 200
    assert roll(client, "u").status_code == 404  # same movie, shown moments ago
    assert roll(client, "someone-else").status_code == 200  # per user


def test_movie_details_endpoint(client):
    d = client.get("/movies/7").json()
    assert d["id"] == 7 and d["title"] == "Movie 7"
    assert d["release_year"] == 1987
    assert d["genre_ids"] and d["trailer_url"]


def test_for_you_needs_five_likes(client):
    for i in range(1, 5):
        swipe(client, "fy", i, "like")
    assert client.post("/for-you", json={"user_id": "fy"}).status_code == 202


def test_for_you_matches_taste(client, fake_tmdb):
    drama = [i for i, m in fake_tmdb.catalog.items() if 18 in m["genre_ids"]][:6]
    for mid in drama:
        roll_body = {"user_id": "fan", "filters": {"genre_ids": [18]}}
        client.post("/random-movie", json=roll_body)  # records genre data
    hist = client.get("/users/fan/history").json()
    for h in hist:
        swipe(client, "fan", h["tmdb_movie_id"], "like")
    prefs = client.get("/users/fan/preferences").json()
    assert prefs["liked_count"] >= 5
    assert prefs["top_genres"][0]["genre_name"] == "Drama"

    r = client.post("/for-you", json={"user_id": "fan"})
    assert r.status_code == 200
    assert r.json()["is_for_you"] is True
    assert fake_tmdb.discover_calls[-1]["with_genres"] == "18"
