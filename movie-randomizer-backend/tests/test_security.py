"""Removed debug routes, CORS rules, and rate limits."""
import pytest

from conftest import roll

LIVE = "https://filmdice-bay.vercel.app"


def cors_origin(client, origin, path="/stats", method="GET"):
    r = client.options(path, headers={"Origin": origin, "Access-Control-Request-Method": method})
    return r.headers.get("access-control-allow-origin")


def test_debug_routes_are_gone(client):
    assert client.get("/debug-key").status_code == 404
    assert client.get("/tmdb-test").status_code == 404


@pytest.mark.parametrize("origin", [
    LIVE,
    "https://filmdice-git-feature-tests-cameron-b.vercel.app",
    "https://filmdice-4u71zvl5z-cameron-b.vercel.app",
    "http://localhost:3000",
])
def test_cors_allows_our_sites(client, origin):
    assert cors_origin(client, origin) == origin


@pytest.mark.parametrize("origin", [
    "https://evil.example.com",
    "https://filmdice-bay.vercel.app.evil.com",
    "https://filmdice-x-someone-else.vercel.app",
])
def test_cors_blocks_other_sites(client, origin):
    assert cors_origin(client, origin) is None


def test_delete_is_limited_per_visitor(client):
    me = {"True-Client-IP": "1.1.1.1"}
    codes = [client.delete(f"/users/u{i}", headers=me).status_code for i in range(11)]
    assert codes[:10] == [204] * 10 and codes[10] == 429
    blocked = client.delete("/users/again", headers={**me, "Origin": LIVE})
    assert blocked.headers.get("retry-after")
    assert blocked.headers.get("access-control-allow-origin") == LIVE  # app can read the 429
    assert client.delete("/users/zz", headers={"True-Client-IP": "2.2.2.2"}).status_code == 204


def test_fast_human_swiper_is_never_limited(client):
    me = {"True-Client-IP": "3.3.3.3"}
    for _ in range(40):
        assert roll(client, "fast", **me).status_code == 200


def test_scripted_rolling_is_limited(client):
    me = {"True-Client-IP": "4.4.4.4"}
    codes = [roll(client, "bot", **me).status_code for _ in range(95)]
    assert codes.index(429) == 90


def test_event_spam_is_limited(client):
    me = {"True-Client-IP": "5.5.5.5"}
    codes = [client.post("/events", json={"name": "trailer_play"}, headers=me).status_code for _ in range(62)]
    assert codes.count(204) == 60 and codes.count(429) == 2
