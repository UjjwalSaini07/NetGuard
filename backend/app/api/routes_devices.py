from fastapi import APIRouter, Depends, HTTPException, Query
from botocore.exceptions import BotoCoreError, ClientError

from app.aws import dynamo_client
from app.config import get_settings
from app.dependencies import require_api_key
from app.logging_config import get_logger


router = APIRouter()
logger = get_logger(__name__)


@router.get("/devices", dependencies=[Depends(require_api_key)])
def list_devices(
    limit: int = Query(default=100, ge=1, le=500),
    next_token: str | None = Query(default=None),
    scan_id: str | None = Query(default=None),
):
    try:
        target_scan_id = scan_id or dynamo_client.get_latest_scan_id()
        if target_scan_id:
            items = dynamo_client.query_devices_by_scan(target_scan_id)
            items.sort(key=lambda x: x.get("discovered_at") or x.get("timestamp") or "", reverse=True)
            offset = int(next_token) if next_token and next_token.isdigit() else 0
            page_items = items[offset : offset + limit]
            new_next = str(offset + limit) if offset + limit < len(items) else None
            return {"items": page_items, "next_token": new_next}

        exclusive_start_key = None
        if next_token:
            exclusive_start_key = {"scan_id": next_token, "offset": next_token}
        response = dynamo_client.scan_all_devices(limit, exclusive_start_key)
        items = response.get("Items", [])

        last_key = response.get("LastEvaluatedKey")
        token_out = None
        if last_key:
            if isinstance(last_key, dict):
                token_out = last_key.get("offset") or last_key.get("scan_id") or last_key.get("device_id")
            else:
                token_out = str(last_key)

        return {
            "items": items,
            "next_token": token_out,
        }
    except (BotoCoreError, ClientError) as exc:
        logger.error(f"dynamodb error listing devices: {exc}")
        settings = get_settings()
        detail = str(exc) if settings.runtime_mode == "local" else "Database query failed while fetching devices."
        raise HTTPException(status_code=502, detail={"error": "dynamodb_error", "detail": detail}) from exc








