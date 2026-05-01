from sqlalchemy import String, Integer, Boolean, DateTime, UniqueConstraint, Index
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func
from app.db import Base

class UserMovieInteraction(Base):
    __tablename__ = "user_movie_interactions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)

    user_id: Mapped[str] = mapped_column(String(128), nullable=False)
    tmdb_movie_id: Mapped[int] = mapped_column(Integer, nullable=False)

    # unseen | watched | dropped
    status: Mapped[str] = mapped_column(String(16), nullable=False, default="unseen")

    # No-queue list (reroll if True)
    skip: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    # Used to suppress repeats
    last_surfaced_at: Mapped[DateTime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        UniqueConstraint("user_id", "tmdb_movie_id", name="uq_user_movie"),
        Index("ix_user_movie_user", "user_id"),
        Index("ix_user_movie_tmdb", "tmdb_movie_id"),
    )