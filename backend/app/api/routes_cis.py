from fastapi import APIRouter, Depends, HTTPException, Query
from botocore.exceptions import BotoCoreError, ClientError

from app.aws import dynamo_client
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
        else:
            exclusive_start_key = None
            if next_token:
                exclusive_start_key = {"scan_id": next_token, "offset": next_token}
            response = dynamo_client.scan_all_cis_results(limit, exclusive_start_key)
            items = response.get("Items", [])

        items.sort(key=lambda x: x.get("check_id") or "")

        if status:
            items = [item for item in items if item.get("status") == status]

        offset = int(next_token) if next_token and next_token.isdigit() else 0
        page_items = items[offset : offset + limit] if target_scan_id else items

        passed = sum(1 for item in items if item.get("status") == "PASS")
        summary = {"total": len(items), "passed": passed, "failed": len(items) - passed}
        return {"items": page_items, "summary": summary}
    except (BotoCoreError, ClientError) as exc:
        logger.error(f"dynamodb error listing cis results: {exc}")
        raise HTTPException(status_code=502, detail={"error": "dynamodb_error", "detail": str(exc)}) from exc







