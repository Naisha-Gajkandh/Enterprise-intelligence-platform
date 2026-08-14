# Frontend → Backend Integration Contract

Everything a React developer needs to consume this API without guessing.

## Base URL
```
http://localhost:8000/api/v1        (local development)
https://<your-render-app>.onrender.com/api/v1   (production, once deployed)
```
Store this as `VITE_API_BASE_URL` (or equivalent) in your frontend's own `.env` file — never hardcode it.

## Authentication
- Method: JWT Bearer token
- Obtain a token from `POST /auth/signup` or `POST /auth/login` (see below)
- Send it on every subsequent request:
  ```
  Authorization: Bearer <access_token>
  ```
- Token lifetime: 24 hours (`expires_in_minutes` is returned in the login/signup response so the frontend can proactively re-prompt login before expiry)
- No refresh-token endpoint exists in this version — on 401, redirect to login. (Documented as a known simplification, not an oversight.)

## Required headers
```
Content-Type: application/json
Authorization: Bearer <token>     (all endpoints except /health, /auth/signup, /auth/login)
```

## CORS
Configured via the `CORS_ORIGINS` environment variable on the backend (comma-separated). Add your frontend's dev URL (e.g. `http://localhost:5173`) and production URL there — requests from any other origin will be blocked by the browser.

## Response envelope (every endpoint, always)
**Success:**
```json
{ "success": true, "data": { ... }, "error": null }
```
**Failure:**
```json
{ "success": false, "data": null, "error": { "code": "SOME_ERROR_CODE", "message": "Human-readable message" } }
```
Frontend code should always check `response.success` before reading `response.data`.

## Error codes reference
| HTTP status | `error.code` | When it happens |
|---|---|---|
| 401 | `UNAUTHORIZED` | Missing/invalid/expired token |
| 401 | `INVALID_CREDENTIALS` | Wrong email/password on login |
| 409 | `EMAIL_ALREADY_REGISTERED` | Signup with an email already in use |
| 400 | `INVALID_BACKTEST_PARAMETERS` | e.g. fast_window >= slow_window |
| 400 | `UNSUPPORTED_STRATEGY` | Unknown `strategy` value |
| 422 | `VALIDATION_ERROR` | Request body fails schema validation (missing field, wrong type, out of range) |
| 500 | `INTERNAL_SERVER_ERROR` | Unexpected server error (logged server-side, generic message returned to client — no internals leaked) |

---

## Endpoint reference

### `GET /health`
No auth required.
**Response 200:**
```json
{ "success": true, "data": { "status": "ok" }, "error": null }
```

---

### `POST /auth/signup`
**Body:**
```json
{ "email": "user@example.com", "password": "SecurePass123", "full_name": "Jane Doe" }
```
Validation: `email` must be a valid email; `password` 8-128 chars; `full_name` required.
**Response 201:**
```json
{
  "success": true,
  "data": {
    "access_token": "eyJ...",
    "token_type": "bearer",
    "expires_in_minutes": 1440,
    "user": { "id": "uuid", "email": "user@example.com", "full_name": "Jane Doe", "created_at": "2026-08-13T12:00:00" }
  },
  "error": null
}
```
**Errors:** 409 `EMAIL_ALREADY_REGISTERED`, 422 `VALIDATION_ERROR`

---

### `POST /auth/login`
**Body:** `{ "email": "...", "password": "..." }`
**Response 200:** same shape as signup's `data`.
**Errors:** 401 `INVALID_CREDENTIALS`

---

### `GET /auth/me`
Auth required.
**Response 200:** `{ "success": true, "data": { "id", "email", "full_name", "created_at" }, "error": null }`
**Errors:** 401 `UNAUTHORIZED`

---

### `POST /backtest/run`
Auth required.
**Body (all fields optional, defaults shown):**
```json
{
  "strategy": "sma_crossover",
  "fast_window": 10,
  "slow_window": 50,
  "fee_pct": 0.1,
  "initial_capital": 10000,
  "days": 365
}
```
Constraints: `fast_window` 2-200, `slow_window` 3-400 and must be greater than `fast_window`, `fee_pct` 0-5, `initial_capital` > 0, `days` 30-3650.
**Response 201:**
```json
{
  "success": true,
  "data": {
    "summary": {
      "id": "uuid", "strategy": "sma_crossover", "fast_window": 10, "slow_window": 50,
      "fee_pct": 0.1, "initial_capital": 10000.0,
      "total_return_pct": -1.43, "sharpe_ratio": -0.289, "max_drawdown_pct": -4.91,
      "cagr_pct": -2.88, "win_rate_pct": 47.06, "total_trades": 4,
      "created_at": "2026-08-13T12:00:00"
    },
    "equity_curve": [ { "date": "2025-08-14", "equity": 10000.0 }, "... one point per day" ]
  },
  "error": null
}
```
**Errors:** 400 `UNSUPPORTED_STRATEGY`, 400 `INVALID_BACKTEST_PARAMETERS`, 422 `VALIDATION_ERROR`, 401 `UNAUTHORIZED`

---

### `GET /backtest/history`
Auth required. Returns the current user's past backtest runs, newest first.
**Response 200:** `{ "success": true, "data": [ <same shape as "summary" above>, ... ], "error": null }`

---

### `GET /analytics/kpis`
Auth required.
**Response 200:**
```json
{
  "success": true,
  "data": {
    "total_revenue": 118225.33, "total_transactions": 692, "average_order_value": 170.85,
    "date_range_start": "2026-05-15 00:00:00", "date_range_end": "2026-08-12 00:00:00"
  },
  "error": null
}
```
If no transaction data exists yet, all numeric fields return `0` and dates return `null` (not an error).

---

### `GET /analytics/revenue-daily`
Auth required.
**Response 200:** `{ "success": true, "data": [ { "date": "2026-08-01", "revenue": 1234.5, "transactions": 8 }, ... ], "error": null }`

---

### `GET /analytics/categories`
Auth required.
**Response 200:** `{ "success": true, "data": [ { "category": "Outerwear", "total_revenue": 42743.35, "total_orders": 139 }, ... ], "error": null }` — sorted by revenue descending.

---

### `GET /analytics/forecast?days=7`
Auth required. Query param `days`: integer 1-30, default 7.
**Response 200:** `{ "success": true, "data": [ { "date": "2026-08-14", "predicted_revenue": 1138.41 }, ... ], "error": null }`
Returns an empty array (not an error) if fewer than 14 days of transaction history exist yet.
**Errors:** 422 `VALIDATION_ERROR` if `days` is out of range.

---

### `POST /assistant/chat`
Auth required.
**Body:** `{ "message": "what is our total revenue and top category?" }` (1-1000 chars)
**Response 200:**
```json
{
  "success": true,
  "data": {
    "reply": "Total revenue is 118225.33 across 692 transactions...",
    "intent": "structured_query",
    "sources": ["transactions (2026-05-15 00:00:00 to 2026-08-12 00:00:00)"]
  },
  "error": null
}
```
`intent` is one of `"structured_query"` (business data questions) or `"product_recommendation"` (product questions). Use this to show a different icon/label in the chat UI if desired.
**Errors:** 422 `VALIDATION_ERROR` (empty message), 401 `UNAUTHORIZED`

---

## File uploads
None of the current endpoints accept file uploads. If you add a "upload your own transaction CSV" feature later, follow FastAPI's `UploadFile` pattern and document the new endpoint here before wiring up the frontend.

## Pagination
Not implemented on any endpoint in this version — `backtest/history`, `analytics/revenue-daily`, and `analytics/categories` all return full result sets, which is fine at hackathon data scale. Documented here as a known limitation, not a hidden gap, so it isn't a surprise if the dataset grows.

## Frontend environment variables checklist
```
VITE_API_BASE_URL=http://localhost:8000/api/v1
```
That's the only one required — everything else (auth token, etc.) is handled at runtime via the login response.
