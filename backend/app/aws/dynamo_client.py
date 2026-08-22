import boto3
from boto3.dynamodb.conditions import Key
from botocore.exceptions import BotoCoreError, ClientError

from app.aws import local_db
from app.config import get_settings
from app.logging_config import get_logger
from app.schemas.cis_result import CisResult
from app.schemas.device import Device
from app.schemas.firewall_rule import FirewallRule

logger = get_logger(__name__)


def _resource():
    settings = get_settings()
    return boto3.resource("dynamodb", region_name=settings.aws_region)


def _client():
    settings = get_settings()
    return boto3.client("dynamodb", region_name=settings.aws_region)


def _is_local_mode() -> bool:
    try:
        return get_settings().runtime_mode == "local"
    except Exception:
        return True


def check_health() -> str:
    settings = get_settings()
    if _is_local_mode():
        try:
            client = _client()
            client.describe_limits()
            return "ok"
        except Exception:
            return "ok"
    try:
        client = _client()
        client.describe_limits()
        return "ok"
    except Exception as exc:
        logger.debug(f"dynamodb health check failed: {exc}")
        return "error"



def put_device(device: Device) -> None:
    settings = get_settings()
    if _is_local_mode():
        try:
            table = _resource().Table(settings.dynamodb_table_devices)
            table.put_item(Item=device.model_dump(mode="json"))
            return
        except (BotoCoreError, ClientError, Exception) as exc:
            logger.debug(f"DynamoDB unavailable locally, saving to local SQLite store: {exc}")
            local_db.put_device(device)
            return

    table = _resource().Table(settings.dynamodb_table_devices)
    table.put_item(Item=device.model_dump(mode="json"))


def put_firewall_rule(rule: FirewallRule) -> None:
    settings = get_settings()
    if _is_local_mode():
        try:
            table = _resource().Table(settings.dynamodb_table_firewall_rules)
            table.put_item(Item=rule.model_dump(mode="json"))
            return
        except (BotoCoreError, ClientError, Exception) as exc:
            logger.debug(f"DynamoDB unavailable locally, saving to local SQLite store: {exc}")
            local_db.put_firewall_rule(rule)
            return

    table = _resource().Table(settings.dynamodb_table_firewall_rules)
    table.put_item(Item=rule.model_dump(mode="json"))


def put_cis_result(result: CisResult) -> None:
    settings = get_settings()
    if _is_local_mode():
        try:
            table = _resource().Table(settings.dynamodb_table_cis_results)
            table.put_item(Item=result.model_dump(mode="json"))
            return
        except (BotoCoreError, ClientError, Exception) as exc:
            logger.debug(f"DynamoDB unavailable locally, saving to local SQLite store: {exc}")
            local_db.put_cis_result(result)
            return

    table = _resource().Table(settings.dynamodb_table_cis_results)
    table.put_item(Item=result.model_dump(mode="json"))


def query_devices_by_scan(scan_id: str) -> list[dict]:
    settings = get_settings()
    if _is_local_mode():
        try:
            table = _resource().Table(settings.dynamodb_table_devices)
            response = table.query(KeyConditionExpression=Key("scan_id").eq(scan_id))
            return response.get("Items", [])
        except (BotoCoreError, ClientError, Exception) as exc:
            logger.debug(f"DynamoDB unavailable locally, querying local SQLite store: {exc}")
            return local_db.query_devices_by_scan(scan_id)

    table = _resource().Table(settings.dynamodb_table_devices)
    response = table.query(KeyConditionExpression=Key("scan_id").eq(scan_id))
    return response.get("Items", [])


def query_firewall_rules_by_scan(scan_id: str) -> list[dict]:
    settings = get_settings()
    if _is_local_mode():
        try:
            table = _resource().Table(settings.dynamodb_table_firewall_rules)
            response = table.query(KeyConditionExpression=Key("scan_id").eq(scan_id))
            return response.get("Items", [])
        except (BotoCoreError, ClientError, Exception) as exc:
            logger.debug(f"DynamoDB unavailable locally, querying local SQLite store: {exc}")
            return local_db.query_firewall_rules_by_scan(scan_id)

    table = _resource().Table(settings.dynamodb_table_firewall_rules)
    response = table.query(KeyConditionExpression=Key("scan_id").eq(scan_id))
    return response.get("Items", [])


def query_cis_results_by_scan(scan_id: str) -> list[dict]:
    settings = get_settings()
    if _is_local_mode():
        try:
            table = _resource().Table(settings.dynamodb_table_cis_results)
            response = table.query(KeyConditionExpression=Key("scan_id").eq(scan_id))
            return response.get("Items", [])
        except (BotoCoreError, ClientError, Exception) as exc:
            logger.debug(f"DynamoDB unavailable locally, querying local SQLite store: {exc}")
            return local_db.query_cis_results_by_scan(scan_id)

    table = _resource().Table(settings.dynamodb_table_cis_results)
    response = table.query(KeyConditionExpression=Key("scan_id").eq(scan_id))
    return response.get("Items", [])


def scan_all_devices(limit: int = 100, exclusive_start_key: dict | None = None) -> dict:
    settings = get_settings()
    if _is_local_mode():
        try:
            table = _resource().Table(settings.dynamodb_table_devices)
            kwargs = {"Limit": limit}
            if exclusive_start_key:
                kwargs["ExclusiveStartKey"] = exclusive_start_key
            response = table.scan(**kwargs)
            return {
                "Items": response.get("Items", []),
                "LastEvaluatedKey": response.get("LastEvaluatedKey"),
            }
        except (BotoCoreError, ClientError, Exception) as exc:
            logger.debug(f"DynamoDB unavailable locally, scanning local SQLite store: {exc}")
            return local_db.scan_all_devices(limit, exclusive_start_key)

    table = _resource().Table(settings.dynamodb_table_devices)
    kwargs = {"Limit": limit}
    if exclusive_start_key:
        kwargs["ExclusiveStartKey"] = exclusive_start_key
    response = table.scan(**kwargs)
    return {
        "Items": response.get("Items", []),
        "LastEvaluatedKey": response.get("LastEvaluatedKey"),
    }


def scan_all_firewall_rules(limit: int = 100, exclusive_start_key: dict | None = None) -> dict:
    settings = get_settings()
    if _is_local_mode():
        try:
            table = _resource().Table(settings.dynamodb_table_firewall_rules)
            kwargs = {"Limit": limit}
            if exclusive_start_key:
                kwargs["ExclusiveStartKey"] = exclusive_start_key
            response = table.scan(**kwargs)
            return {
                "Items": response.get("Items", []),
                "LastEvaluatedKey": response.get("LastEvaluatedKey"),
            }
        except (BotoCoreError, ClientError, Exception) as exc:
            logger.debug(f"DynamoDB unavailable locally, scanning local SQLite store: {exc}")
            return local_db.scan_all_firewall_rules(limit, exclusive_start_key)

    table = _resource().Table(settings.dynamodb_table_firewall_rules)
    kwargs = {"Limit": limit}
    if exclusive_start_key:
        kwargs["ExclusiveStartKey"] = exclusive_start_key
    response = table.scan(**kwargs)
    return {
        "Items": response.get("Items", []),
        "LastEvaluatedKey": response.get("LastEvaluatedKey"),
    }


def scan_all_cis_results(limit: int = 100, exclusive_start_key: dict | None = None) -> dict:
    settings = get_settings()
    if _is_local_mode():
        try:
            table = _resource().Table(settings.dynamodb_table_cis_results)
            kwargs = {"Limit": limit}
            if exclusive_start_key:
                kwargs["ExclusiveStartKey"] = exclusive_start_key
            response = table.scan(**kwargs)
            return {
                "Items": response.get("Items", []),
                "LastEvaluatedKey": response.get("LastEvaluatedKey"),
            }
        except (BotoCoreError, ClientError, Exception) as exc:
            logger.debug(f"DynamoDB unavailable locally, scanning local SQLite store: {exc}")
            return local_db.scan_all_cis_results(limit, exclusive_start_key)

    table = _resource().Table(settings.dynamodb_table_cis_results)
    kwargs = {"Limit": limit}
    if exclusive_start_key:
        kwargs["ExclusiveStartKey"] = exclusive_start_key
    response = table.scan(**kwargs)
    return {
        "Items": response.get("Items", []),
        "LastEvaluatedKey": response.get("LastEvaluatedKey"),
    }




def get_latest_scan_id() -> str | None:
    settings = get_settings()
    if _is_local_mode():
        try:
            table = _resource().Table(settings.dynamodb_table_devices)
            response = table.scan(ProjectionExpression="scan_id, discovered_at", Limit=500)
            items = response.get("Items", [])
            if items:
                items.sort(key=lambda x: x.get("discovered_at") or "", reverse=True)
                return items[0].get("scan_id")
        except (BotoCoreError, ClientError, Exception) as exc:
            logger.debug(f"DynamoDB unavailable locally, getting latest scan_id from local SQLite: {exc}")
            return local_db.get_latest_scan_id()

    try:
        table = _resource().Table(settings.dynamodb_table_devices)
        response = table.scan(ProjectionExpression="scan_id, discovered_at", Limit=500)
        items = response.get("Items", [])
        if items:
            items.sort(key=lambda x: x.get("discovered_at") or "", reverse=True)
            return items[0].get("scan_id")
    except Exception as exc:
        logger.debug(f"Failed to get latest scan_id from DynamoDB: {exc}")
    return local_db.get_latest_scan_id()


