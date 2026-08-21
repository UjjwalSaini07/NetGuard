import json

import boto3

from app.config import get_settings
from app.logging_config import get_logger

logger = get_logger(__name__)


def archive_raw_result(scan_id: str, payload: dict) -> None:
    settings = get_settings()
    if not settings.s3_bucket_raw_results:
        return
    try:
        client = boto3.client("s3", region_name=settings.aws_region)
        client.put_object(
            Bucket=settings.s3_bucket_raw_results,
            Key=f"scans/{scan_id}.json",
            Body=json.dumps(payload, default=str).encode("utf-8"),
            ContentType="application/json",
        )
    except Exception as exc:
        logger.warning(f"failed to archive raw result for {scan_id}: {exc}")
