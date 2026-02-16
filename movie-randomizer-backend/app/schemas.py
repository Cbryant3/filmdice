from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any

class Filters(BaseModel):
    # existing
    genre_ids: Optional[List[int]] = None
    year_min: Optional[int] = None
    year_max: Optional[int] = None
    rating_min: Optional[float] = None
    vote_count_min: Optional[int] = None
    language: Optional[str] = None
    region: Optional[str] = None

    # NEW: exclude genres
    exclude_genre_ids: Optional[List[int]] = None

    # NEW: decade shortcut (e.g., 1990 means 1990-1999)
    decade: Optional[int] = None

    # NEW: runtime filter (minutes)
    runtime_min: Optional[int] = None
    runtime_max: Optional[int] = None

    # NEW: providers requirements
    must_be_streaming: Optional[bool] = False

    # NEW: content rating include/exclude (MPAA-style, region-specific)
    content_rating_include: Optional[List[str]] = None
    content_rating_exclude: Optional[List[str]] = None
    content_rating_region: Optional[str] = None  # defaults to region

class RandomMovieRequest(BaseModel):
    filters: Filters = Filters()
    reroll_max: int = Field(10, ge=1, le=50)

class RandomMovieResponse(BaseModel):
    id: int
    title: str
    overview: str | None = None
    poster_url: str | None = None

    # NEW
    runtime: int | None = None
    trailer_url: str | None = None

    # NEW: where to watch
    where_to_watch: Dict[str, Any] | None = None

    # NEW: content rating resolved
    content_rating: str | None = None