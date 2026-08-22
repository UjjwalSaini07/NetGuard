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
    assert response.json() == {"status": "ok"}


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
    from app.aws import local_db
    from app.schemas.device import Device

    dev_old = Device(
        device_id="dev-old",
        scan_id="scan-old-111",
        ip_address="10.0.0.1",
        discovered_at="2026-08-20T00:00:00Z",
    )
    dev_new = Device(
        device_id="dev-new",
        scan_id="scan-new-222",
        ip_address="10.0.0.2",
        discovered_at="2026-08-22T00:00:00Z",
    )
    local_db.put_device(dev_old)
    local_db.put_device(dev_new)

    response = client.get("/devices", headers={"x-api-key": API_KEY})
    assert response.status_code == 200
    data = response.json()
    assert len(data["items"]) >= 1
    assert all(item["scan_id"] == "scan-new-222" for item in data["items"])




