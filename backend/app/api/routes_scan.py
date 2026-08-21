from fastapi import APIRouter, Depends, HTTPException

from app.config import get_settings
from app.dependencies import require_api_key
from app.logging_config import get_logger
from app.orchestrator.scan_orchestrator import TargetTooLargeError, run_scan
from app.schemas.scan_request import ScanRequest

router = APIRouter()
logger = get_logger(__name__)


@router.post("/scan", dependencies=[Depends(require_api_key)])
def trigger_scan(scan_request: ScanRequest):
    settings = get_settings()
    max_hosts = settings.scan_max_hosts_lambda if settings.runtime_mode == "lambda" else settings.scan_max_hosts

    try:
        result = run_scan(scan_request, max_hosts=max_hosts)
        return result
    except TargetTooLargeError as exc:
        raise HTTPException(
            status_code=422,
            detail="target too large for synchronous Lambda scan, reduce host count or run locally"
            if settings.runtime_mode == "lambda"
            else str(exc),
        ) from exc
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except Exception as exc:
        logger.error(f"scan failed: {exc}")
        raise HTTPException(status_code=502, detail={"error": "scan_failed", "detail": str(exc)}) from exc
