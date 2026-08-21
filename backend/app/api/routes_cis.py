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
):
    try:
        if scan_id:
            items = dynamo_client.query_cis_results_by_scan(scan_id)
        else:
            response = dynamo_client.scan_all_cis_results(limit, None)
            items = response.get("Items", [])

        if status:
            items = [item for item in items if item.get("status") == status]

        passed = sum(1 for item in items if item.get("status") == "PASS")
        summary = {"total": len(items), "passed": passed, "failed": len(items) - passed}
        return {"items": items, "summary": summary}
    except (BotoCoreError, ClientError) as exc:
        logger.error(f"dynamodb error listing cis results: {exc}")
        raise HTTPException(status_code=502, detail={"error": "dynamodb_error", "detail": str(exc)}) from exc
