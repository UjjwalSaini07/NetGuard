import os

os.environ.setdefault("NETGUARD_API_KEY", "test-key-123")
os.environ.setdefault("DYNAMODB_TABLE_DEVICES", "TestDevices")
os.environ.setdefault("DYNAMODB_TABLE_FIREWALL_RULES", "TestFirewallRules")
os.environ.setdefault("DYNAMODB_TABLE_CIS_RESULTS", "TestCisResults")
os.environ.setdefault("RUNTIME_MODE", "local")
os.environ.setdefault("SCAN_MAX_HOSTS_LAMBDA", "4")

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.orchestrator import scan_orchestrator

client = TestClient(app)
API_KEY = os.environ["NETGUARD_API_KEY"]


def test_health_check_requires_no_auth():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["dynamodb"] == "ok"



def test_devices_endpoint_rejects_missing_api_key():
    response = client.get("/devices")
    assert response.status_code == 401


def test_devices_endpoint_rejects_wrong_api_key():
    response = client.get("/devices", headers={"x-api-key": "wrong"})
    assert response.status_code == 401


def test_devices_endpoint_accepts_correct_api_key(monkeypatch):
    monkeypatch.setattr(
        "app.aws.dynamo_client.get_latest_scan_id",
        lambda: None,
    )
    monkeypatch.setattr(
        "app.aws.dynamo_client.scan_all_devices",
        lambda limit, key: {"Items": [], "LastEvaluatedKey": None},
    )
    response = client.get("/devices", headers={"x-api-key": API_KEY})
    assert response.status_code == 200
    assert response.json()["items"] == []


def test_firewall_rules_endpoint_filters_by_action(monkeypatch):
    monkeypatch.setattr(
        "app.aws.dynamo_client.get_latest_scan_id",
        lambda: None,
    )
    monkeypatch.setattr(
        "app.aws.dynamo_client.scan_all_firewall_rules",
        lambda limit, key: {"Items": [{"action": "permit"}, {"action": "deny"}]},
    )
    response = client.get("/firewall-rules?action=deny", headers={"x-api-key": API_KEY})
    assert response.status_code == 200
    assert all(item["action"] == "deny" for item in response.json()["items"])


def test_cis_results_endpoint_returns_summary(monkeypatch):
    monkeypatch.setattr(
        "app.aws.dynamo_client.get_latest_scan_id",
        lambda: None,
    )
    monkeypatch.setattr(
        "app.aws.dynamo_client.scan_all_cis_results",
        lambda limit, key: {"Items": [{"status": "PASS"}, {"status": "FAIL"}]},
    )
    response = client.get("/cis-results", headers={"x-api-key": API_KEY})
    assert response.status_code == 200
    body = response.json()
    assert body["summary"] == {"total": 2, "passed": 1, "failed": 1}



def test_scan_endpoint_local_mode_runs_synchronously(monkeypatch):
    monkeypatch.setattr(
        scan_orchestrator,
        "run_scan",
        lambda scan_request, max_hosts: {
            "scan_id": "abc",
            "timestamp": "now",
            "devices": [],
            "firewall_rules": [],
            "cis_results": [],
            "summary": {"total": 8, "passed": 0, "failed": 8},
        },
    )
    monkeypatch.setattr("app.api.routes_scan.run_scan", scan_orchestrator.run_scan)
    response = client.post(
        "/scan",
        json={"target": "127.0.0.1"},
        headers={"x-api-key": API_KEY},
    )
    assert response.status_code == 200
    assert response.json()["scan_id"] == "abc"


def test_scan_endpoint_lambda_mode_rejects_oversized_target(monkeypatch):
    from app.config import get_settings

    get_settings.cache_clear()
    monkeypatch.setenv("RUNTIME_MODE", "lambda")
    get_settings.cache_clear()

    response = client.post(
        "/scan",
        json={"target": "10.0.0.0/24"},
        headers={"x-api-key": API_KEY},
    )
    assert response.status_code == 422

    monkeypatch.setenv("RUNTIME_MODE", "local")
    get_settings.cache_clear()


def test_local_db_storage():
    from app.aws import local_db
    from app.schemas.device import Device
    from app.schemas.firewall_rule import FirewallRule
    from app.schemas.cis_result import CisResult

    test_scan_id = "test-scan-xyz"
    dev = Device(
        device_id="dev-1",
        scan_id=test_scan_id,
        ip_address="192.168.1.100",
        discovered_at="2026-08-21T00:00:00Z",
    )
    local_db.put_device(dev)
    devs = local_db.query_devices_by_scan(test_scan_id)
    assert len(devs) == 1
    assert devs[0]["device_id"] == "dev-1"

    rule = FirewallRule(
        rule_id="r-1",
        scan_id=test_scan_id,
        source="any",
        destination="any",
        protocol="ip",
        action="deny",
        direction="egress",
        raw_line="deny ip any any",
    )
    local_db.put_firewall_rule(rule)
    rules = local_db.query_firewall_rules_by_scan(test_scan_id)
    assert len(rules) == 1
    assert rules[0]["rule_id"] == "r-1"

    cis = CisResult(
        check_id="check_1",
        scan_id=test_scan_id,
        title="Check 1",
        cis_reference="1.1",
        status="PASS",
        evidence="ok",
    )
    local_db.put_cis_result(cis)
    cis_items = local_db.query_cis_results_by_scan(test_scan_id)
    assert len(cis_items) == 1
    assert cis_items[0]["check_id"] == "check_1"


def test_scan_endpoint_rejects_path_traversal_firewall_config():
    response = client.post(
        "/scan",
        json={"target": "127.0.0.1", "firewall_config_path": "/etc/hostname"},
        headers={"x-api-key": API_KEY},
    )
    assert response.status_code == 422

    response2 = client.post(
        "/scan",
        json={"target": "127.0.0.1", "firewall_config_path": "../../etc/passwd"},
        headers={"x-api-key": API_KEY},
    )
    assert response2.status_code == 422


def test_devices_pagination_with_next_token():
    from app.aws import local_db
    from app.schemas.device import Device

    for i in range(5):
        dev = Device(
            device_id=f"page-dev-{i}",
            scan_id=f"scan-p-{i}",
            ip_address=f"10.0.1.{i+1}",
            discovered_at=f"2026-08-22T00:00:0{i}Z",
        )
        local_db.put_device(dev)

    page1 = local_db.scan_all_devices(limit=2)
    assert len(page1["Items"]) == 2
    assert page1["LastEvaluatedKey"] is not None

    page2 = local_db.scan_all_devices(limit=2, exclusive_start_key=page1["LastEvaluatedKey"])
    assert len(page2["Items"]) == 2
    assert page2["Items"][0]["device_id"] != page1["Items"][0]["device_id"]


def test_devices_endpoint_scopes_to_latest_scan_when_no_scan_id():
    import uuid
    from datetime import datetime, timezone
    from app.aws import local_db
    from app.schemas.device import Device

    with local_db._get_connection() as conn:
        conn.execute("DELETE FROM scans")

    ts_now = datetime.now(timezone.utc).isoformat()
    scan_old = f"scan-old-{uuid.uuid4().hex[:6]}"
    scan_new = f"scan-new-{uuid.uuid4().hex[:6]}"

    local_db.put_scan_metadata(
        scan_id=scan_new,
        created_at=ts_now,
        target="10.0.0.2",
        status="COMPLETED",
    )
    dev_old = Device(
        device_id="dev-old",
        scan_id=scan_old,
        ip_address="10.0.0.1",
        discovered_at="2026-08-20T00:00:00Z",
    )
    dev_new = Device(
        device_id="dev-new",
        scan_id=scan_new,
        ip_address="10.0.0.2",
        discovered_at=ts_now,
    )
    local_db.put_device(dev_old)
    local_db.put_device(dev_new)

    response = client.get("/devices", headers={"x-api-key": API_KEY})
    assert response.status_code == 200
    data = response.json()
    assert len(data["items"]) >= 1
    assert all(item["scan_id"] == scan_new for item in data["items"])



def test_cis_results_endpoint_returns_next_token_when_more_pages_exist():
    from app.aws import local_db
    from app.schemas.cis_result import CisResult

    test_scan = "scan-cis-pagination-test"
    for i in range(5):
        cis = CisResult(
            check_id=f"check_p_{i}",
            scan_id=test_scan,
            title=f"Check {i}",
            cis_reference=f"1.{i}",
            status="PASS" if i % 2 == 0 else "FAIL",
            evidence="ok",
        )
        local_db.put_cis_result(cis)

    resp1 = client.get(f"/cis-results?scan_id={test_scan}&limit=2", headers={"x-api-key": API_KEY})
    assert resp1.status_code == 200
    data1 = resp1.json()
    assert len(data1["items"]) == 2
    assert data1["next_token"] is not None

    resp2 = client.get(
        f"/cis-results?scan_id={test_scan}&limit=2&next_token={data1['next_token']}",
        headers={"x-api-key": API_KEY},
    )
    assert resp2.status_code == 200
    data2 = resp2.json()
    assert len(data2["items"]) == 2
    assert data2["next_token"] is not None

    resp3 = client.get(
        f"/cis-results?scan_id={test_scan}&limit=2&next_token={data2['next_token']}",
        headers={"x-api-key": API_KEY},
    )
    assert resp3.status_code == 200
    data3 = resp3.json()
    assert len(data3["items"]) == 1
    assert data3["next_token"] is None


def test_scan_metadata_indexing_and_latest_scan_resolution():
    import uuid
    from datetime import datetime, timezone, timedelta
    from app.aws import dynamo_client, local_db

    with local_db._get_connection() as conn:
        conn.execute("DELETE FROM scans")

    base_time = datetime.now(timezone.utc)
    ts1 = (base_time - timedelta(minutes=10)).isoformat()
    ts2 = base_time.isoformat()
    scan1 = f"scan-meta-1-{uuid.uuid4().hex[:6]}"
    scan2 = f"scan-meta-2-{uuid.uuid4().hex[:6]}"

    local_db.put_scan_metadata(
        scan_id=scan1,
        created_at=ts1,
        target="10.0.0.1",
        status="COMPLETED",
    )
    local_db.put_scan_metadata(
        scan_id=scan2,
        created_at=ts2,
        target="10.0.0.2",
        status="COMPLETED",
    )

    resolved = dynamo_client.get_latest_scan_id()
    assert resolved == scan2


def test_s3_archive_skipped_when_no_bucket_configured(monkeypatch):
    from app.aws import s3_client
    from app.config import get_settings

    get_settings.cache_clear()
    monkeypatch.setenv("S3_BUCKET_RAW_RESULTS", "")
    get_settings.cache_clear()

    status = s3_client.archive_raw_result("scan-test-1", {"test": "data"})
    assert status == "skipped"


def test_s3_archive_synced_when_upload_succeeds(monkeypatch):
    from unittest.mock import MagicMock
    from app.aws import s3_client
    from app.config import get_settings

    get_settings.cache_clear()
    monkeypatch.setenv("S3_BUCKET_RAW_RESULTS", "test-bucket")
    get_settings.cache_clear()

    mock_client = MagicMock()
    monkeypatch.setattr("boto3.client", lambda service, **kwargs: mock_client)

    status = s3_client.archive_raw_result("scan-test-2", {"test": "data"})
    assert status == "synced"
    mock_client.put_object.assert_called_once()


def test_s3_archive_failed_when_upload_raises(monkeypatch):
    from unittest.mock import MagicMock
    from app.aws import s3_client
    from app.config import get_settings

    get_settings.cache_clear()
    monkeypatch.setenv("S3_BUCKET_RAW_RESULTS", "test-bucket")
    get_settings.cache_clear()

    mock_client = MagicMock()
    mock_client.put_object.side_effect = RuntimeError("S3 Put Failed")
    monkeypatch.setattr("boto3.client", lambda service, **kwargs: mock_client)

    status = s3_client.archive_raw_result("scan-test-3", {"test": "data"})
    assert status == "failed"


def test_lambda_mode_sanitizes_scan_error_response(monkeypatch):
    from app.config import get_settings

    get_settings.cache_clear()
    monkeypatch.setenv("RUNTIME_MODE", "lambda")
    get_settings.cache_clear()

    def _failing_scan(*args, **kwargs):
        raise RuntimeError("Internal sensitive AWS path /secret/keys/db.key failed")

    monkeypatch.setattr("app.api.routes_scan.run_scan", _failing_scan)

    response = client.post("/scan", json={"target": "127.0.0.1"}, headers={"x-api-key": API_KEY})
    assert response.status_code == 502
    data = response.json()
    assert "/secret/keys" not in str(data)
    assert data["detail"]["detail"] == "Security sweep failed. Check network connectivity or service logs."

    monkeypatch.setenv("RUNTIME_MODE", "local")
    get_settings.cache_clear()


def test_local_mode_preserves_detailed_scan_error_response(monkeypatch):
    from app.config import get_settings

    get_settings.cache_clear()
    monkeypatch.setenv("RUNTIME_MODE", "local")
    get_settings.cache_clear()

    def _failing_scan(*args, **kwargs):
        raise RuntimeError("Local socket connection refused on 127.0.0.1:8080")

    monkeypatch.setattr("app.api.routes_scan.run_scan", _failing_scan)

    response = client.post("/scan", json={"target": "127.0.0.1"}, headers={"x-api-key": API_KEY})
    assert response.status_code == 502
    data = response.json()
    assert "Local socket connection refused" in data["detail"]["detail"]












