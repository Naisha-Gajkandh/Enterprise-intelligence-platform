# Enterprise Intelligence Platform — Backend

Production-ready FastAPI backend for PS-05: Backtesting, DataMart Analytics, and a Retail AI Assistant, unified behind one API with JWT authentication.

No paid services are required to run this. The AI Assistant works with zero external API keys (templated responses); optionally set `GROQ_API_KEY` (free tier, no credit card) for LLM-polished replies.

---

## 1. Prerequisites

- Python 3.11 or 3.12
- pip
- (Optional, for Postgres instead of SQLite) Docker + Docker Compose, or a free Postgres instance such as [Neon](https://neon.tech)

---

## 2. Installation

```bash
git clone <your-repo-url>
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
```

Generate a secret key and put it in `.env`:

```bash
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

Paste the output as `SECRET_KEY=` in `.env`. This is the only required environment variable — everything else has a safe default for local development.

---

## 3. Database setup

**Option A — SQLite (default, zero setup)**
Nothing to do. `DATABASE_URL=sqlite:///./app.db` in `.env.example` already works out of the box; tables are created automatically on first run.

**Option B — Postgres (recommended before deploying)**
Set `DATABASE_URL` in `.env` to a Postgres connection string, e.g. a free [Neon](https://neon.tech) database:
```
DATABASE_URL=postgresql://user:password@your-neon-host/dbname
```
No manual migration step is needed — tables are created automatically on startup via `Base.metadata.create_all`. (For a larger production system you would replace this with Alembic migrations; noted under Known Limitations below.)

**Seed demo data** (10 products + ~90 days of synthetic transactions, so Analytics and Assistant have data to work with immediately):
```bash
python seed.py
```

---

## 4. Running the app

**Development:**
```bash
uvicorn app.main:app --reload
```
API available at `http://localhost:8000`. Interactive docs at `http://localhost:8000/docs`.

**Production (no reload, multiple workers):**
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 2
```

**Via Docker Compose** (runs Postgres + backend together):
```bash
export SECRET_KEY=$(python -c "import secrets; print(secrets.token_urlsafe(48))")
docker compose up --build
```

---

## 5. Testing

```bash
pytest tests/ -v
```

29 tests covering: health check, signup/login (success + duplicate email + invalid email + weak password), auth token validation (missing/invalid token), backtesting (success, invalid window parameters, unsupported strategy, out-of-range inputs, history retrieval), analytics (empty-data edge case, KPIs, daily revenue, category breakdown, forecast with insufficient data, forecast with valid data, invalid query parameters), and the assistant (auth required, empty message validation, structured-query intent, product-recommendation intent).

Tests run against an isolated SQLite database that is fully reset before every individual test, so results are deterministic regardless of run order.

---

## 6. API documentation

- Interactive (Swagger UI): `/docs`
- Interactive (ReDoc): `/redoc`
- Full endpoint table + request/response examples: see `API_CONTRACT.md` in this repo — this is the file your frontend developer should read first.

---

## 7. Frontend integration

See `API_CONTRACT.md` for the complete contract. In short:
- Base URL: `http://localhost:8000/api/v1` (or your deployed URL)
- Auth: `Authorization: Bearer <token>` header, token obtained from `/auth/login` or `/auth/signup`
- Every response is a consistent envelope: `{"success": bool, "data": ..., "error": {"code": ..., "message": ...} | null}`
- CORS is controlled by `CORS_ORIGINS` in `.env` — add your frontend's dev/prod URL there

---

## 8. Deployment (free tier)

1. Push this repo to GitHub.
2. **Database:** create a free Neon Postgres project, copy the connection string.
3. **Backend:** create a free Render web service pointing at this repo, set `DATABASE_URL`, `SECRET_KEY`, `CORS_ORIGINS`, and (optionally) `GROQ_API_KEY` as environment variables in Render's dashboard, build command `pip install -r requirements.txt`, start command `uvicorn app.main:app --host 0.0.0.0 --port $PORT`.
4. Run `python seed.py` once against the production database (e.g. via Render's shell) to load demo data.

---

## 9. Troubleshooting

| Problem | Fix |
|---|---|
| `ImportError: email-validator is not installed` | Run `pip install -r requirements.txt` again — this is in the requirements file already, likely an incomplete install |
| `401 Unauthorized` on every request | Check the `Authorization: Bearer <token>` header is present and the token hasn't expired (default 24h) |
| Forecast endpoint returns an empty list | The model needs at least 14 days of transaction history — run `python seed.py` or add more transactions |
| CORS errors in the browser console | Add your frontend's exact origin (including port) to `CORS_ORIGINS` in `.env` |
| SQLite "database is locked" under load | Expected under SQLite's concurrency model — switch to Postgres via `DATABASE_URL` before deploying for real multi-user use |

---

## 10. Known limitations (documented honestly, not hidden)

- **No Alembic migrations** — schema changes currently require `Base.metadata.create_all`, which only adds new tables, not new columns to existing tables. Fine for a hackathon timeline; add Alembic before this becomes a long-lived production system.
- **No rate limiting** on any endpoint. Acceptable for a hackathon demo; add `slowapi` or a reverse-proxy-level limiter before public production use.
- **Docker image was not build-tested in the authoring environment** (no Docker daemon available there) — the Dockerfile follows standard, widely-used patterns, but run `docker compose up --build` yourself before relying on it for your first deploy, and adjust if your platform surfaces anything environment-specific.
- **Backtesting uses a deterministic synthetic price series** by default (no external market-data dependency, so it works with zero API keys). Swap `generate_price_series()` in `app/services/backtest_engine.py` for a real data loader if you want to backtest against actual historical prices.
- **The Assistant's intent router is keyword-based**, not a trained classifier — this is an intentional simplicity/explainability trade-off for a hackathon timeline, documented here rather than overstated as more sophisticated than it is.
