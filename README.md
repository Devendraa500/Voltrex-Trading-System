# Voltrex Terminal

Voltrex Terminal is a broker-integrated institutional swing-trading workstation
for Indian equities. Its core is the Voltrex Square-Root Harmonic Equilibrium
Engine, shared by the scanner, API, Streamlit validation UI, and Next.js
terminal.

## Included Systems

- Real Zerodha authentication, instrument lookup, historical candles, and
  KiteTicker live-feed adapter
- Centralized equilibrium engine with TV, QR1-QR3, QS1-QS3, stop and RR levels
- Multi-symbol scanner with SMA, EMA, RSI, ATR, volume, regime, sizing, scoring,
  grading, ranking, and per-symbol error isolation
- FastAPI REST and WebSocket API
- SQLite persistence for watchlists, alerts, scan history, and trade journal
- Portfolio analytics including P&L, win rate, expectancy, profit factor, and
  drawdown
- Deterministic trade-intelligence explanations
- Next.js terminal using Tailwind CSS, Framer Motion, and Lightweight Charts
- Streamlit retained only as a validation/prototyping surface

## Architecture

```text
Zerodha KiteConnect / KiteTicker
            |
services/market_data.py + services/live_market.py
            |
scanners/equilibrium_scanner.py
            |
engines/equilibrium.py
            |
FastAPI REST + WebSocket (api/main.py)
            |
SQLite repositories (api/database.py)
            |
Next.js terminal (frontend/)
```

The proprietary formulas live only in `engines/equilibrium.py`. Frontends and
API routes never reimplement them.

## First-Time Setup

PowerShell:

```powershell
Copy-Item .env.example .env
.\venv\Scripts\python.exe -m pip install -r requirements.txt
Set-Location frontend
npm.cmd install
Copy-Item .env.local.example .env.local
npm.cmd run build
Set-Location ..
```

Set these values in `.env`:

```dotenv
ZERODHA_API_KEY=...
ZERODHA_API_SECRET=...
ZERODHA_ACCESS_TOKEN=...
```

Zerodha access tokens are session credentials and generally need to be renewed
after expiry. Never commit `.env`.

## Run For Development

Open two PowerShell terminals:

```powershell
.\scripts\start_backend.ps1
```

```powershell
.\scripts\start_frontend.ps1
```

Then open:

- Terminal: http://127.0.0.1:3000
- API documentation: http://127.0.0.1:8000/docs
- API health: http://127.0.0.1:8000/api/v1/health

## Run Production Builds Locally

Build once:

```powershell
Set-Location frontend
npm.cmd run build
Set-Location ..
```

Start both services:

```powershell
.\scripts\start_production.ps1
```

## Verification

```powershell
.\scripts\verify.ps1
```

This runs scanner, database, analytics, API, instrument, and WebSocket tests,
compiles Python packages, and creates an optimized Next.js production build.

## Primary API Routes

| Method | Route | Purpose |
| --- | --- | --- |
| GET | `/api/v1/health` | Service and Zerodha configuration status |
| GET | `/api/v1/equilibrium/{price}` | Canonical Voltrex levels |
| GET | `/api/v1/market/candles/{symbol}` | Real Zerodha OHLCV candles |
| POST | `/api/v1/scanner/run` | Run and persist a real multi-symbol scan |
| GET | `/api/v1/scanner/latest` | Latest ranked scan snapshot |
| GET/POST/PUT/DELETE | `/api/v1/watchlists` | Persistent watchlists |
| GET/POST/PATCH/DELETE | `/api/v1/alerts` | Persistent market alerts |
| GET/POST/DELETE | `/api/v1/trades` | Trade journal |
| POST | `/api/v1/trades/{id}/close` | Close a journal position |
| GET | `/api/v1/analytics/portfolio` | Portfolio analytics |
| POST | `/api/v1/intelligence/explain` | Explain a resolved setup |
| POST | `/api/v1/live/start` | Start real KiteTicker subscriptions |
| POST | `/api/v1/live/stop` | Stop KiteTicker |
| WS | `/ws/market` | Ticks, scans, alerts, and terminal events |

## Production Deployment Notes

- Run the API and frontend behind TLS and a reverse proxy.
- Set `VOLTREX_ENV=production` and restrict `VOLTREX_CORS_ORIGINS`.
- Replace the local `X-User-Id` development identity with verified JWT claims
  from Supabase/Auth0 before exposing multi-user deployments.
- Move SQLite to PostgreSQL for horizontal scaling; persistence is isolated
  behind `Database`, so this does not affect scanner or API contracts.
- Place long-running scans in a task queue when the symbol universe expands.
- Broker order placement is deliberately excluded. Journal actions do not place
  trades. Add execution only after authorization, idempotency, limits, audit
  trails, and kill-switch controls are implemented.

## Legacy Utilities

Existing Zerodha scripts, CSV backtest utilities, and `streamlit run app.py`
remain available for diagnostics. CSVs are not used as the production market
data source.
