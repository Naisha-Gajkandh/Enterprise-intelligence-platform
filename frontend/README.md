# Enterprise Intelligence Console

PS-05 · Sustainability & Smart Infrastructure — a single frontend that unifies
three backend capabilities into one product, not three bolted-together apps:

- **Backtesting** — SMA crossover strategies, t+1 execution, transaction costs, evidence of zero look-ahead bias
- **DataMart Analytics** — DuckDB-powered KPIs/revenue/category aggregation and an XGBoost 7-day forecast
- **Retail AI Assistant** — structured-data-first answers with an inspectable Response Trace, Groq LLM polish as an optional layer, never the source of truth

Built with React 18, Vite, React Router and Recharts. No CSS framework — a
small hand-built design system tuned to a light, financial/BI aesthetic
(off-white surfaces, dark navy type, restrained blue accent, thin borders,
tabular monospace numerals) instead of a generic AI-dashboard look.

## Getting started

```bash
npm install
cp .env.example .env   # point VITE_API_BASE_URL at your FastAPI backend
npm run dev             # http://localhost:5173
```

```bash
npm run build            # production build to dist/
npm run preview          # serve the production build locally
```

## Environment configuration

All backend wiring lives in `.env` (see `.env.example`):

| Variable | Purpose |
|---|---|
| `VITE_API_BASE_URL` | Root URL of the FastAPI server, e.g. `http://localhost:8000` |
| `VITE_API_PREFIX` | Router prefix, matches `app/main.py` — defaults to `/api/v1` |
| `VITE_API_TIMEOUT_MS` | Request timeout before an adapter falls back to demo data |
| `VITE_FORCE_MOCK` | `true` to always use demo data — useful for offline demos |

Nothing else in the app reads `import.meta.env` directly — every module goes
through `src/api/config.js`.

## How it maps to the backend

| Sidebar section | Backend surface |
|---|---|
| Command Center | Aggregates `/analytics/kpis`, `/analytics/revenue-daily`, `/analytics/forecast`, `/backtest/history` |
| Analytics | `/analytics/kpis`, `/analytics/revenue-daily`, `/analytics/categories`, `/analytics/forecast` |
| Data Explorer / Data Upload | `/upload/analyze` (multipart CSV/XLSX → Ollama-summarized profile) |
| Backtesting | `POST /backtest/run` |
| Backtest History | `GET /backtest/history` |
| Retail Assistant | `POST /assistant/chat` |
| Products | Catalog used by the assistant's retrieval layer (see schema note below) |
| System Health | Gateway liveness probe, service list (see schema note below) |
| Settings | Reads the active `VITE_API_*` configuration; no backend call |

Every request goes through `src/api/client.js`, which unwraps the backend's
`{ success, data, error }` envelope, attaches the JWT bearer token, and — on
network failure, timeout, or a 5xx — transparently falls back to realistic
mock data from `src/api/mock/mockData.js`. Any page rendering fallback data
shows an inline "Showing demo data — …" notice, so it's never silent. This
means the entire console is demoable with the backend fully offline.

### Isolated schema assumptions

The architecture doc doesn't publish a dedicated products catalog route or a
health-check route. Rather than guessing across the codebase, those two
assumptions are isolated to single files so they're a one-line change if the
real backend differs:

- `src/api/products.js` — assumes `GET /assistant/products` (owned by the assistant engine's retrieval layer, per the doc)
- `src/api/health.js` — probes `GET {base}/docs` (FastAPI's default OpenAPI page) as a gateway liveness check, then reports the other five services from representative data until a real `/health` endpoint exists

No other adapter makes assumptions beyond what's in the architecture doc —
`auth.js`, `backtest.js`, `analytics.js`, `assistant.js`, and `upload.js` call
exactly the routers and paths described (`/auth`, `/backtest`, `/analytics`,
`/assistant`, `/upload`).

## Project structure

```
src/
  api/            axios client, per-router adapters, mock fallback data
  components/
    common/       Card, StatCard, status pills, states, trace panel, ProtectedRoute
    layout/       Sidebar, Topbar, AppLayout
  context/        AuthContext (JWT session, login/signup/logout)
  pages/          one file per sidebar destination, plus auth/
  styles/         design tokens, layout, auth shell CSS
  utils/          small session-scoped dataset store shared by Upload/Explorer
```

## Auth

JWT-based: `POST /auth/signup` and `POST /auth/login` return a token that's
stored in `localStorage` and attached to every request. A 401 response
anywhere triggers an app-wide logout. All routes except `/login` and
`/register` are behind `ProtectedRoute`.

## Notes for reviewers

- Every data view has real loading, error (with retry), and empty states —
  nothing renders blank.
- Layout is responsive down to mobile: the sidebar collapses behind a menu
  button under 960px.
- The Backtesting and Analytics pages both surface an explicit
  evidence/validation panel (signal-at-t vs execution-at-t+1, transaction
  costs, chronological train/test split, lag features) so the quantitative
  and ML claims are checkable, not just asserted.
- The Retail Assistant's Response Trace shows Query → Intent Router →
  Retrieval → Draft → optional Groq polish, and explicitly labels the
  fallback path when `GROQ_API_KEY` isn't configured.
