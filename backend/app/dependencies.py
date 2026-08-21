import hmac

from fastapi import Header, HTTPException, status

from app.config import get_settings


def require_api_key(x_api_key: str = Header(default="")) -> None:
    settings = get_settings()
    if not x_api_key or not hmac.compare_digest(x_api_key, settings.netguard_api_key):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid or missing x-api-key")
