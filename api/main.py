import asyncio
import os
from contextlib import asynccontextmanager
from dataclasses import asdict
from datetime import datetime, timedelta
from typing import Annotated, Any

from fastapi import Depends, FastAPI, HTTPException, Header, Query, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from pydantic import BaseModel, Field
from pymongo.errors import DuplicateKeyError

from api.auth import (
    create_access_token,
    decode_access_token,
    hash_password,
    verify_password,
)
from api.config import settings
from api.dependencies import current_user_id, database, websocket_hub
from api.schemas import (
    Alert,
    AlertInput,
    AlertState,
    AuthResponse,
    ExplanationRequest,
    HealthResponse,
    LoginRequest,
    RegisterRequest,
    ScanRequest,
    Trade,
    TradeClose,
    TradeInput,
    UserProfile,
    Watchlist,
    WatchlistInput,
)
from engines.equilibrium import calculate_equilibrium_levels
from instrument_lookup import get_instrument_token
from scanners.equilibrium_scanner import ScanConfig
from services.analytics import portfolio_analytics
from services.explanations import explain_scan_result
from services.live_market import ZerodhaLiveMarketService
from services.market_data import ZerodhaMarketDataProvider
from services.scanner_service import ScannerService
from services.nifty50 import get_nifty50_symbols


market_data = ZerodhaMarketDataProvider()
scanner_service = ScannerService(market_data, database, websocket_hub)
live_market = ZerodhaLiveMarketService(websocket_hub)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await database.initialize()
    existing = await database.list_watchlists("local-user")
    if not existing:
        await database.create_watchlist(
            "Core Equities",
            "local-user",
            list(settings.default_symbols),
        )
    yield
    await live_market.stop()


app = FastAPI(
    title=settings.app_name,
    version="1.0.0",
    description=(
        "Institutional equilibrium intelligence API for Indian equities."
    ),
    lifespan=lifespan,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=list(settings.cors_origins),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/", include_in_schema=False)
async def root():
    return RedirectResponse("/docs")


# ── Auth endpoints ───────────────────────────────────────────────────────────

@app.post("/api/v1/auth/register", response_model=AuthResponse, status_code=201)
async def register(payload: RegisterRequest) -> dict[str, Any]:
    existing = await database.get_user_by_email(payload.email)
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered")

    hashed = hash_password(payload.password)
    try:
        user = await database.create_user(payload.name, payload.email, hashed)
    except DuplicateKeyError:
        raise HTTPException(status_code=409, detail="Email already registered")
    token = create_access_token(user["id"])
    return {"token": token, "user": user}


@app.post("/api/v1/auth/login", response_model=AuthResponse)
async def login(payload: LoginRequest) -> dict[str, Any]:
    user_row = await database.get_user_with_hash(payload.email)
    if not user_row:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not verify_password(payload.password, user_row["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    # Remove password_hash before returning
    user_row.pop("password_hash", None)
    token = create_access_token(user_row["id"])
    return {"token": token, "user": user_row}


@app.get("/api/v1/auth/me", response_model=UserProfile)
async def auth_me(
    authorization: Annotated[str | None, Header()] = None,
) -> dict[str, Any]:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = authorization.split(" ", 1)[1]
    try:
        user_id = decode_access_token(token)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    user = await database.get_user_by_id(str(user_id))
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


@app.get("/api/v1/health", response_model=HealthResponse)
async def health() -> dict[str, Any]:
    # Mask the MongoDB URI for security
    uri = settings.mongodb_uri
    masked = uri.split("@")[-1] if "@" in uri else uri
    return {
        "status": "ok",
        "service": settings.app_name,
        "environment": settings.environment,
        "database": f"mongodb://*****@{masked}",
        "zerodha_configured": bool(
            os.getenv("ZERODHA_API_KEY") and os.getenv("ZERODHA_ACCESS_TOKEN")
        ),
    }


@app.get("/api/v1/equilibrium/{price}")
async def equilibrium(price: float) -> dict[str, Any]:
    try:
        return calculate_equilibrium_levels(price)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@app.get("/api/v1/instruments/{symbol}")
async def instrument(symbol: str) -> dict[str, Any]:
    token = get_instrument_token(symbol)
    if token is None:
        raise HTTPException(status_code=404, detail="NSE instrument not found")
    return {"symbol": symbol.strip().upper(), "instrument_token": token}


@app.get("/api/v1/market/candles/{symbol}")
async def candles(
    symbol: str,
    interval: str = Query(default="day"),
    days: int = Query(default=365, ge=1, le=2000),
) -> dict[str, Any]:
    to_date = datetime.now()
    from_date = to_date - timedelta(days=days)
    try:
        frame = await asyncio.to_thread(
            market_data.get_candles,
            symbol.strip().upper(),
            interval,
            from_date,
            to_date,
        )
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    normalized = frame.copy()
    if "date" in normalized.columns:
        normalized["date"] = normalized["date"].astype(str)
    return {
        "symbol": symbol.strip().upper(),
        "interval": interval,
        "candles": normalized.to_dict(orient="records"),
    }


@app.post("/api/v1/scanner/run")
async def run_scanner(
    request: ScanRequest,
    user_id: Annotated[str, Depends(current_user_id)],
) -> dict[str, Any]:
    symbols = request.symbols or get_nifty50_symbols()
    config = ScanConfig(
        interval=request.interval,
        lookback_days=request.lookback_days,
        account_size=request.account_size,
        risk_per_trade=request.risk_per_trade,
        maximum_position_fraction=request.maximum_position_fraction,
        minimum_rr=request.minimum_rr,
        minimum_volume_ratio=request.minimum_volume_ratio,
        include_hold=request.include_hold,
    )
    return await scanner_service.run(symbols, config, user_id)


@app.get("/api/v1/scanner/latest")
async def latest_scan() -> dict[str, Any]:
    result = await database.latest_scan()
    if result is None:
        return {
            "run_id": None,
            "created_at": None,
            "symbols": [],
            "config": asdict(ScanConfig()),
            "errors": {},
            "results": [],
        }
    return result


@app.get("/api/v1/watchlists", response_model=list[Watchlist])
async def list_watchlists(
    user_id: Annotated[str, Depends(current_user_id)],
):
    return await database.list_watchlists(user_id)


@app.post("/api/v1/watchlists", response_model=Watchlist, status_code=201)
async def create_watchlist(
    payload: WatchlistInput,
    user_id: Annotated[str, Depends(current_user_id)],
):
    try:
        return await database.create_watchlist(
            payload.name,
            user_id,
            payload.symbols,
        )
    except DuplicateKeyError:
        raise HTTPException(
            status_code=409,
            detail="Watchlist name already exists",
        )


@app.put("/api/v1/watchlists/{watchlist_id}", response_model=Watchlist)
async def update_watchlist(
    watchlist_id: str,
    payload: WatchlistInput,
    user_id: Annotated[str, Depends(current_user_id)],
):
    result = await database.update_watchlist(
        watchlist_id,
        user_id,
        payload.name,
        payload.symbols,
    )
    if result is None:
        raise HTTPException(status_code=404, detail="Watchlist not found")
    return result


@app.delete("/api/v1/watchlists/{watchlist_id}", status_code=204)
async def delete_watchlist(
    watchlist_id: str,
    user_id: Annotated[str, Depends(current_user_id)],
):
    deleted = await database.delete_watchlist(watchlist_id, user_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Watchlist not found")


@app.get("/api/v1/alerts", response_model=list[Alert])
async def list_alerts(
    user_id: Annotated[str, Depends(current_user_id)],
):
    return await database.list_alerts(user_id)


@app.post("/api/v1/alerts", response_model=Alert, status_code=201)
async def create_alert(
    payload: AlertInput,
    user_id: Annotated[str, Depends(current_user_id)],
):
    return await database.create_alert(
        user_id,
        payload.symbol,
        payload.condition,
        payload.threshold,
    )


@app.patch("/api/v1/alerts/{alert_id}", response_model=Alert)
async def update_alert(
    alert_id: str,
    payload: AlertState,
    user_id: Annotated[str, Depends(current_user_id)],
):
    result = await database.update_alert_state(
        alert_id,
        user_id,
        payload.active,
    )
    if result is None:
        raise HTTPException(status_code=404, detail="Alert not found")
    return result


@app.delete("/api/v1/alerts/{alert_id}", status_code=204)
async def delete_alert(
    alert_id: str,
    user_id: Annotated[str, Depends(current_user_id)],
):
    deleted = await database.delete_alert(alert_id, user_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Alert not found")


@app.get("/api/v1/trades", response_model=list[Trade])
async def list_trades(
    user_id: Annotated[str, Depends(current_user_id)],
):
    return await database.list_trades(user_id)


@app.post("/api/v1/trades", response_model=Trade, status_code=201)
async def create_trade(
    payload: TradeInput,
    user_id: Annotated[str, Depends(current_user_id)],
):
    return await database.create_trade(
        {"user_id": user_id, **payload.model_dump()},
    )


@app.post("/api/v1/trades/{trade_id}/close", response_model=Trade)
async def close_trade(
    trade_id: str,
    payload: TradeClose,
    user_id: Annotated[str, Depends(current_user_id)],
):
    result = await database.close_trade(
        trade_id,
        user_id,
        payload.exit_price,
        payload.notes,
    )
    if result is None:
        raise HTTPException(status_code=404, detail="Trade not found")
    return result


@app.delete("/api/v1/trades/{trade_id}", status_code=204)
async def delete_trade(
    trade_id: str,
    user_id: Annotated[str, Depends(current_user_id)],
):
    deleted = await database.delete_trade(trade_id, user_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Trade not found")


@app.get("/api/v1/analytics/portfolio")
async def analytics(
    user_id: Annotated[str, Depends(current_user_id)],
):
    trades = await database.list_trades(user_id)
    return portfolio_analytics(trades)


@app.post("/api/v1/intelligence/explain")
async def explain(payload: ExplanationRequest) -> dict[str, Any]:
    return explain_scan_result(payload.scan_result)


class LiveSubscription(BaseModel):
    symbols: list[str] = Field(min_length=1, max_length=100)


@app.get("/api/v1/live/status")
async def live_status() -> dict[str, Any]:
    return {
        **live_market.status(),
        "terminal_connections": websocket_hub.connection_count,
    }


@app.post("/api/v1/live/start")
async def live_start(payload: LiveSubscription) -> dict[str, Any]:
    try:
        return await live_market.start(payload.symbols)
    except (RuntimeError, ValueError) as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@app.post("/api/v1/live/stop")
async def live_stop() -> dict[str, Any]:
    return await live_market.stop()


@app.websocket("/ws/market")
async def market_socket(websocket: WebSocket):
    await websocket_hub.connect(websocket)
    try:
        await websocket.send_json(
            {
                "type": "terminal.connected",
                "data": {"connections": websocket_hub.connection_count},
            }
        )
        while True:
            message = await websocket.receive_json()
            if message.get("type") == "ping":
                await websocket.send_json({"type": "pong"})
    except (WebSocketDisconnect, Exception):
        pass
    finally:
        await websocket_hub.disconnect(websocket)
