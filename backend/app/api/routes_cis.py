from fastapi import APIRouter, Depends, HTTPException, Query
from botocore.exceptions import BotoCoreError, ClientError

from app.aws import dynamo_client
from app.config import get_settings
from app.dependencies import require_api_key
from app.logging_config import get_logger


router = APIRouter()
logger = get_logger(__name__)


@router.get("/cis-results", dependencies=[Depends(require_api_key)])
def list_cis_results(
    status: str | None = Query(default=None, pattern="^(PASS|FAIL)$"),
    scan_id: str | None = Query(default=None),
    limit: int = Query(default=100, ge=1, le=500),
    next_token: str | None = Query(default=None),
):
    try:
        target_scan_id = scan_id or dynamo_client.get_latest_scan_id()
        if target_scan_id:
            items = dynamo_client.query_cis_results_by_scan(target_scan_id)
            if status:
                items = [item for item in items if item.get("status") == status]
            items.sort(key=lambda x: x.get("check_id") or "")
            offset = int(next_token) if next_token and next_token.isdigit() else 0
            page_items = items[offset : offset + limit]
            token_out = str(offset + limit) if offset + limit < len(items) else None
        else:
            exclusive_start_key = None
            if next_token:
                exclusive_start_key = {"scan_id": next_token, "offset": next_token}
            response = dynamo_client.scan_all_cis_results(limit, exclusive_start_key)
            items = response.get("Items", [])
            if status:
                items = [item for item in items if item.get("status") == status]
            items.sort(key=lambda x: x.get("check_id") or "")
            page_items = items
            last_key = response.get("LastEvaluatedKey")
            token_out = None
            if last_key:
                if isinstance(last_key, dict):
                    token_out = last_key.get("offset") or last_key.get("scan_id") or last_key.get("check_id")
                else:
                    token_out = str(last_key)

        passed = sum(1 for item in items if item.get("status") == "PASS")
        summary = {"total": len(items), "passed": passed, "failed": len(items) - passed}
        return {"items": page_items, "summary": summary, "next_token": token_out}
    except (BotoCoreError, ClientError) as exc:
        logger.error(f"dynamodb error listing cis results: {exc}")
        settings = get_settings()
        detail = str(exc) if settings.runtime_mode == "local" else "Database query failed while fetching CIS benchmark results."
        raise HTTPException(status_code=502, detail={"error": "dynamodb_error", "detail": detail}) from exc









