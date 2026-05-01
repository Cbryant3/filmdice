FilmDice — Smart Movie Recommendation API

FilmDice is a backend service designed to power a full-featured movie recommendation application. The goal of this project is to provide users with intelligent, filter-driven movie suggestions that are immediately actionable (watchable, relevant, and personalized).

The API integrates with The Movie Database (TMDb) to retrieve movie data and enhances it with user-specific behavior tracking and filtering logic.

Project Purpose

This project is intended to serve as the backend foundation for a production-ready movie discovery application. It focuses on solving common user problems such as:

Decision fatigue when choosing a movie
Receiving recommendations that are not currently available to watch
Repeated suggestions of previously seen content
Lack of personalization in random recommendations

The system is designed to evolve into a complete application with a frontend interface, user accounts, and advanced recommendation features.

Core Features
Random Movie Generation
Generates a random movie using TMDb Discover API
Supports controlled randomness through filtering and reroll logic
Advanced Filtering
Genre inclusion and exclusion
Year range and decade selection
Runtime constraints
Rating and popularity thresholds
Language and region filtering
Content rating (MPAA-style) inclusion and exclusion
Streaming Availability
Returns where a movie can be watched (subscription, rent, buy)
Optional enforcement of “must be streaming”
Movie Metadata

Each response includes:

Title
Overview
Poster
Runtime
Trailer (YouTube)
Streaming providers
Content rating
User Interaction Tracking
Tracks watched movies
Tracks skipped (no-queue) movies
Tracks dropped movies
Prevents resurfacing of watched or skipped content
Suppresses recently suggested movies
Performance Optimization
In-memory caching for external API calls
Reduced redundant TMDb requests
Configurable reroll attempts
Technology Stack
Backend Framework: FastAPI
Database: PostgreSQL
ORM: SQLAlchemy (async)
HTTP Client: httpx
Containerization: Docker
External API: The Movie Database (TMDb)
Project Structure
app/
├── main.py              # FastAPI routes and core logic
├── schemas.py           # Request and response models
├── tmdb_client.py       # TMDb API integration
├── db.py                # Database connection setup
├── models.py            # Database models
├── config.py            # Environment configuration
├── cache.py             # In-memory caching layer
Setup Instructions
1. Clone the Repository
git clone <your-repo-url>
cd movie-randomizer-backend
2. Create Virtual Environment
python -m venv .venv
.venv\Scripts\activate
3. Install Dependencies
pip install -r requirements.txt
4. Configure Environment Variables

Create a .env file in the root directory:

TMDB_API_KEY=your_tmdb_api_key
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/moviedb
5. Start Database (Docker)
docker compose up -d
6. Run the API
python -m uvicorn app.main:app --reload
7. Access API Documentation
http://127.0.0.1:8000/docs
API Endpoints
Get Random Movie

POST /random-movie

Example request:

{
  "user_id": "ro-1",
  "filters": {
    "genre_ids": [27],
    "year_min": 2013,
    "year_max": 2013,
    "rating_min": 6.0
  },
  "reroll_max": 10,
  "suppress_days": 30
}
Save User Interaction

POST /interactions

Example:

{
  "user_id": "ro-1",
  "tmdb_movie_id": 9603,
  "status": "watched"
}
Clear Cache (Development Only)

POST /admin/cache/clear

Example Use Cases
Filtered random movie selection (e.g., horror films from a specific year)
Only recommending movies currently available on streaming platforms
Avoiding previously watched or skipped movies
Supporting different viewing scenarios (short films, high-rated films, etc.)
Future Enhancements
Frontend application (web or mobile)
User authentication and account management
Persistent caching layer (Redis)
Recommendation engine based on user behavior
Analytics tracking (watch time, preferred genres)
Improved filtering (keywords, mood-based selection)
Notes
TMDb API rate limits apply
Some movies may not have complete metadata (e.g., content rating or providers)
Caching is used to reduce external API calls and improve performance
Author

Cameron Bryant
Chicago-based developer focused on building scalable backend systems and real-world applications.