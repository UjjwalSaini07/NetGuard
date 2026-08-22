import json
import sqlite3
from pathlib import Path

from app.logging_config import get_logger
from app.schemas.cis_result import CisResult
from app.schemas.device import Device
from app.schemas.firewall_rule import FirewallRule

logger = get_logger(__name__)

DB_PATH = Path(__file__).resolve().parent.parent.parent / "netguard_local.db"


def _get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    with _get_connection() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS devices (
                scan_id TEXT,
                device_id TEXT,
                item_json TEXT,
                PRIMARY KEY (scan_id, device_id)
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS firewall_rules (
                scan_id TEXT,
                rule_id TEXT,
                item_json TEXT,
                PRIMARY KEY (scan_id, rule_id)
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS cis_results (
                scan_id TEXT,
                check_id TEXT,
                item_json TEXT,
                PRIMARY KEY (scan_id, check_id)
            )
            """
        )


def put_device(device: Device) -> None:
    init_db()
    with _get_connection() as conn:
        conn.execute(
            "INSERT OR REPLACE INTO devices (scan_id, device_id, item_json) VALUES (?, ?, ?)",
            (device.scan_id, device.device_id, json.dumps(device.model_dump(mode="json"))),
        )


def put_firewall_rule(rule: FirewallRule) -> None:
    init_db()
    with _get_connection() as conn:
        conn.execute(
            "INSERT OR REPLACE INTO firewall_rules (scan_id, rule_id, item_json) VALUES (?, ?, ?)",
            (rule.scan_id, rule.rule_id, json.dumps(rule.model_dump(mode="json"))),
        )


def put_cis_result(result: CisResult) -> None:
    init_db()
    with _get_connection() as conn:
        conn.execute(
            "INSERT OR REPLACE INTO cis_results (scan_id, check_id, item_json) VALUES (?, ?, ?)",
            (result.scan_id, result.check_id, json.dumps(result.model_dump(mode="json"))),
        )


def query_devices_by_scan(scan_id: str) -> list[dict]:
    init_db()
    with _get_connection() as conn:
        cursor = conn.execute("SELECT item_json FROM devices WHERE scan_id = ?", (scan_id,))
        return [json.loads(row["item_json"]) for row in cursor.fetchall()]


def query_firewall_rules_by_scan(scan_id: str) -> list[dict]:
    init_db()
    with _get_connection() as conn:
        cursor = conn.execute("SELECT item_json FROM firewall_rules WHERE scan_id = ?", (scan_id,))
        return [json.loads(row["item_json"]) for row in cursor.fetchall()]


def query_cis_results_by_scan(scan_id: str) -> list[dict]:
    init_db()
    with _get_connection() as conn:
        cursor = conn.execute("SELECT item_json FROM cis_results WHERE scan_id = ?", (scan_id,))
        return [json.loads(row["item_json"]) for row in cursor.fetchall()]


def scan_all_devices(limit: int, exclusive_start_key: dict | None = None) -> dict:
    init_db()
    with _get_connection() as conn:
        cursor = conn.execute("SELECT item_json FROM devices ORDER BY rowid DESC LIMIT ?", (limit,))
        items = [json.loads(row["item_json"]) for row in cursor.fetchall()]
        return {"Items": items, "LastEvaluatedKey": None}


def scan_all_firewall_rules(limit: int, exclusive_start_key: dict | None = None) -> dict:
    init_db()
    with _get_connection() as conn:
        cursor = conn.execute("SELECT item_json FROM firewall_rules ORDER BY rowid DESC LIMIT ?", (limit,))
        items = [json.loads(row["item_json"]) for row in cursor.fetchall()]
        return {"Items": items, "LastEvaluatedKey": None}


def scan_all_cis_results(limit: int, exclusive_start_key: dict | None = None) -> dict:
    init_db()
    with _get_connection() as conn:
        cursor = conn.execute("SELECT item_json FROM cis_results ORDER BY rowid DESC LIMIT ?", (limit,))
        items = [json.loads(row["item_json"]) for row in cursor.fetchall()]
        return {"Items": items, "LastEvaluatedKey": None}

