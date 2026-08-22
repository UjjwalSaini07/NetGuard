from fastapi import APIRouter, Depends, HTTPException, Query
from botocore.exceptions import BotoCoreError, ClientError

from app.aws import dynamo_client
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
        if scan_id:
            items = dynamo_client.query_devices_by_scan(scan_id)
            return {"items": items, "next_token": None}

        exclusive_start_key = {"scan_id": next_token} if next_token else None
        response = dynamo_client.scan_all_devices(limit, exclusive_start_key)
        raw_items = response.get("Items", [])
        raw_items.sort(key=lambda x: x.get("discovered_at") or x.get("timestamp") or "", reverse=True)
        deduped = {}
        items_without_ip = []
        for item in raw_items:
            ip = item.get("ip_address")
            if ip:
                if ip not in deduped:
                    deduped[ip] = item
            else:
                items_without_ip.append(item)
        items = list(deduped.values()) + items_without_ip
        last_key = response.get("LastEvaluatedKey")
        return {
            "items": items,
            "next_token": last_key.get("scan_id") if last_key else None,
        }

    except (BotoCoreError, ClientError) as exc:
        logger.error(f"dynamodb error listing devices: {exc}")
        raise HTTPException(status_code=502, detail={"error": "dynamodb_error", "detail": str(exc)}) from exc


