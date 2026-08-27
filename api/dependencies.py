from typing import Annotated

from fastapi import Header

from api.config import settings
from api.database import Database
from services.websocket_hub import WebSocketHub


database = Database(settings.mongodb_uri, settings.mongodb_db_name)
websocket_hub = WebSocketHub()


def current_user_id(
    x_user_id: Annotated[str | None, Header()] = None,
) -> str:
    return (x_user_id or "local-user").strip() or "local-user"
