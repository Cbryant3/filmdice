from sqlalchemy import String, Integer, Boolean, DateTime, UniqueConstraint, Index, JSON
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func
from app.db import Base


class UserPreferenceCache(Base):
    """Cached genre/decade scores per user. Invalidated on every interaction write."""
    __tablename__ = "user_preference_cache"

    user_id: Mapped[str] = mapped_column(String(128), primary_key=True)
    genre_scores: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    decade_scores: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    liked_count: Mapped[int] = mapped_column(Integer, default=0)
    total_interactions: Mapped[int] = mapped_column(Integer, default=0)
    updated_at: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class UserMovieInteraction(Base):
    __tablename__ = "user_movie_interactions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)

    user_id: Mapped[str] = mapped_column(String(128), nullable=False)
    tmdb_movie_id: Mapped[int] = mapped_column(Integer, nullable=False)

    # unseen | watched | dropped
    status: Mapped[str] = mapped_column(String(16), nullable=False, default="unseen")

    # No-queue list (reroll if True)
    skip: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    # Preference learning — captured from discover result at surfacing time
    genre_ids: Mapped[list | None] = mapped_column(JSON, nullable=True)
    release_year: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # Used to suppress repeats
    last_surfaced_at: Mapped[DateTime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        UniqueConstraint("user_id", "tmdb_movie_id", name="uq_user_movie"),
        Index("ix_user_movie_tmdb", "tmdb_movie_id"),
    )