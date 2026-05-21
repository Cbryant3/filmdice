from pydantic import BaseModel, Field, model_validator
from pydantic import ConfigDict
from typing import Optional, List, Dict, Any, Literal
from datetime import datetime


class Filters(BaseModel):
    genre_ids: Optional[List[int]] = None
    exclude_genre_ids: Optional[List[int]] = None
    year_min: Optional[int] = Field(None, ge=1888, le=2100)
    year_max: Optional[int] = Field(None, ge=1888, le=2100)
    decades: Optional[List[int]] = None  # e.g. [1990, 2000] → 1990-2009 (ignored if year_min/max set)
    rating_min: Optional[float] = Field(None, ge=0.0, le=10.0)
    rating_max: Optional[float] = Field(None, ge=0.0, le=10.0)
    vote_count_min: Optional[int] = Field(None, ge=0)
    runtime_min: Optional[int] = Field(None, ge=0)
    runtime_max: Optional[int] = Field(None, ge=0)
    language: Optional[str] = Field(None, max_length=8)
    region: Optional[str] = Field(None, max_length=4)
    must_be_streaming: Optional[bool] = False
    content_rating_include: Optional[List[str]] = None
    content_rating_exclude: Optional[List[str]] = None
    content_rating_region: Optional[str] = Field(None, max_length=4)
    sort_by: Optional[Literal[
        "popularity.desc",
        "vote_average.desc",
        "primary_release_date.desc",
    ]] = "popularity.desc"

    @model_validator(mode="after")
    def check_ranges(self) -> "Filters":
        if self.year_min is not None and self.year_max is not None:
            if self.year_min > self.year_max:
                raise ValueError("year_min must be <= year_max")
        if self.rating_min is not None and self.rating_max is not None:
            if self.rating_min > self.rating_max:
                raise ValueError("rating_min must be <= rating_max")
        if self.runtime_min is not None and self.runtime_max is not None:
            if self.runtime_min > self.runtime_max:
                raise ValueError("runtime_min must be <= runtime_max")
        return self


class RandomMovieRequest(BaseModel):
    user_id: str = Field(..., max_length=128)
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
    user_id: str = Field(..., max_length=128)
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
    user_id: str = Field(..., max_length=128)
    region: str = Field("US", max_length=4)
    reroll_max: int = Field(10, ge=1, le=50)
    suppress_days: int = Field(30, ge=0, le=365)
