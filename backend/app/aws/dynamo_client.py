import boto3
from boto3.dynamodb.conditions import Key

from app.config import get_settings
from app.logging_config import get_logger
from app.schemas.cis_result import CisResult
from app.schemas.device import Device
from app.schemas.firewall_rule import FirewallRule

logger = get_logger(__name__)


def _resource():
    settings = get_settings()
    return boto3.resource("dynamodb", region_name=settings.aws_region)


def put_device(device: Device) -> None:
    settings = get_settings()
    table = _resource().Table(settings.dynamodb_table_devices)
    table.put_item(Item=device.model_dump(mode="json"))


def put_firewall_rule(rule: FirewallRule) -> None:
    settings = get_settings()
    table = _resource().Table(settings.dynamodb_table_firewall_rules)
    table.put_item(Item=rule.model_dump(mode="json"))


def put_cis_result(result: CisResult) -> None:
    settings = get_settings()
    table = _resource().Table(settings.dynamodb_table_cis_results)
    table.put_item(Item=result.model_dump(mode="json"))


def query_devices_by_scan(scan_id: str) -> list[dict]:
    settings = get_settings()
    table = _resource().Table(settings.dynamodb_table_devices)
    response = table.query(KeyConditionExpression=Key("scan_id").eq(scan_id))
    return response.get("Items", [])


def query_firewall_rules_by_scan(scan_id: str) -> list[dict]:
    settings = get_settings()
    table = _resource().Table(settings.dynamodb_table_firewall_rules)
    response = table.query(KeyConditionExpression=Key("scan_id").eq(scan_id))
    return response.get("Items", [])


def query_cis_results_by_scan(scan_id: str) -> list[dict]:
    settings = get_settings()
    table = _resource().Table(settings.dynamodb_table_cis_results)
    response = table.query(KeyConditionExpression=Key("scan_id").eq(scan_id))
    return response.get("Items", [])


def scan_all_devices(limit: int, exclusive_start_key: dict | None) -> dict:
    settings = get_settings()
    table = _resource().Table(settings.dynamodb_table_devices)
    kwargs = {"Limit": limit}
    if exclusive_start_key:
        kwargs["ExclusiveStartKey"] = exclusive_start_key
    return table.scan(**kwargs)


def scan_all_firewall_rules(limit: int, exclusive_start_key: dict | None) -> dict:
    settings = get_settings()
    table = _resource().Table(settings.dynamodb_table_firewall_rules)
    kwargs = {"Limit": limit}
    if exclusive_start_key:
        kwargs["ExclusiveStartKey"] = exclusive_start_key
    return table.scan(**kwargs)


def scan_all_cis_results(limit: int, exclusive_start_key: dict | None) -> dict:
    settings = get_settings()
    table = _resource().Table(settings.dynamodb_table_cis_results)
    kwargs = {"Limit": limit}
    if exclusive_start_key:
        kwargs["ExclusiveStartKey"] = exclusive_start_key
    return table.scan(**kwargs)
