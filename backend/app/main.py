import time
from datetime import datetime, timezone
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.router import api_router
from app.aws import dynamo_client
from app.config import get_settings
from app.logging_config import configure_logging, get_logger

START_TIME = time.time()
settings = get_settings()
configure_logging(settings.log_level)
logger = get_logger(__name__)

app = FastAPI(title="NetGuard API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.error(f"unhandled exception on {request.url.path}: {exc}")
    return JSONResponse(status_code=500, content={"error": "internal_error", "detail": str(exc)})


@app.get("/health")
def health_check():
    db_status = dynamo_client.check_health()
    uptime = round(time.time() - START_TIME, 2)
    overall_status = "ok" if db_status == "ok" else "degraded"
    return {
        "status": overall_status,
        "dynamodb": db_status,
        "runtime_mode": settings.runtime_mode,
        "aws_region": settings.aws_region,
        "version": "1.0.0",
        "uptime_seconds": uptime,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "services": {
            "database": db_status,
            "benchmark_engine": "ok",
            "host_discovery": "ok",
        },
    }


app.include_router(api_router)


