from pydantic import BaseModel, Field
from pydantic import ConfigDict
from typing import Optional, List, Dict, Any, Literal
from datetime import datetime


class Filters(BaseModel):
    genre_ids: Optional[List[int]] = None
    exclude_genre_ids: Optional[List[int]] = None
    year_min: Optional[int] = None
    year_max: Optional[int] = None
    decades: Optional[List[int]] = None  # e.g. [1990, 2000] → 1990-2009 (ignored if year_min/max set)
    rating_min: Optional[float] = None
    rating_max: Optional[float] = None
    vote_count_min: Optional[int] = None
    runtime_min: Optional[int] = None
    runtime_max: Optional[int] = None
    language: Optional[str] = None
    region: Optional[str] = None
    must_be_streaming: Optional[bool] = False
    content_rating_include: Optional[List[str]] = None
    content_rating_exclude: Optional[List[str]] = None
    content_rating_region: Optional[str] = None  # defaults to region
    sort_by: Optional[Literal[
        "popularity.desc",
        "vote_average.desc",
        "primary_release_date.desc",
    ]] = "popularity.desc"


class RandomMovieRequest(BaseModel):
    user_id: str
    filters: Filters = Filters()
    reroll_max: int = Field(10, ge=1, le=50)
    suppress_days: int = Field(30, ge=0, le=365)


class RandomMovieResponse(BaseModel):
    id: int
    title: str
    overview: str | None = None
    poster_url: str | None = None
    runtime: int | None = None
    release_year: int | None = None
    trailer_url: str | None = None
    where_to_watch: Dict[str, Any] | None = None
    content_rating: str | None = None
    is_for_you: bool = False
    genre_ids: List[int] | None = None


class InteractionUpsert(BaseModel):
    user_id: str
    tmdb_movie_id: int
    status: Optional[Literal["unseen", "watched", "liked", "dropped"]] = None
    skip: Optional[bool] = None


class InteractionRecord(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    tmdb_movie_id: int
    status: str
    skip: bool
    last_surfaced_at: datetime | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None


# ---------------------------------------------------------------------------
# Preference learning
# ---------------------------------------------------------------------------

class GenreScore(BaseModel):
    genre_id: int
    genre_name: str
    score: float


class DecadeScore(BaseModel):
    decade: int   # e.g. 1990 means the 1990s
    score: float


class UserPreferencesResponse(BaseModel):
    user_id: str
    top_genres: List[GenreScore]
    top_decades: List[DecadeScore]
    liked_count: int
    total_interactions: int


class ForYouRequest(BaseModel):
    user_id: str
    reroll_max: int = Field(10, ge=1, le=50)
    suppress_days: int = Field(30, ge=0, le=365)
