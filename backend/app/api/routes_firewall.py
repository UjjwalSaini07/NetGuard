from fastapi import APIRouter, Depends, HTTPException, Query
from botocore.exceptions import BotoCoreError, ClientError

from app.aws import dynamo_client
from app.dependencies import require_api_key
from app.logging_config import get_logger

router = APIRouter()
logger = get_logger(__name__)


@router.get("/firewall-rules", dependencies=[Depends(require_api_key)])
def list_firewall_rules(
    action: str | None = Query(default=None, pattern="^(permit|deny)$"),
    scan_id: str | None = Query(default=None),
    limit: int = Query(default=100, ge=1, le=500),
):
    try:
        if scan_id:
            items = dynamo_client.query_firewall_rules_by_scan(scan_id)
        else:
            response = dynamo_client.scan_all_firewall_rules(limit, None)
            raw_items = response.get("Items", [])
            target_scan_id = raw_items[0].get("scan_id") if raw_items and raw_items[0].get("scan_id") else None
            if target_scan_id:
                items = [item for item in raw_items if item.get("scan_id") == target_scan_id]
            else:
                items = raw_items[:limit]

        if action:
            items = [item for item in items if item.get("action") == action]

        return {"items": items}
    except (BotoCoreError, ClientError) as exc:
        logger.error(f"dynamodb error listing firewall rules: {exc}")
        raise HTTPException(status_code=502, detail={"error": "dynamodb_error", "detail": str(exc)}) from exc



