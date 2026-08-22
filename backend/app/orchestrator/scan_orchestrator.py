import uuid
from datetime import datetime, timezone

from app.aws import dynamo_client, s3_client
from app.benchmarks.engine import run_all_checks
from app.config import get_settings
from app.firewall.parser import parse_firewall_config, parse_firewall_context
from app.logging_config import get_logger
from app.scanners.host_discovery import discover_hosts, expand_targets
from app.scanners.mac_vendor import lookup_vendor, read_arp_table
from app.scanners.port_scanner import scan_host_ports
from app.schemas.device import Device, OpenPort
from app.schemas.scan_request import ScanRequest

logger = get_logger(__name__)


class TargetTooLargeError(ValueError):
    pass


def validate_target_size(target: str, max_hosts: int) -> None:
    target = target.strip()
    if "/" in target:
        try:
            import ipaddress
            network = ipaddress.ip_network(target, strict=False)
            if network.num_addresses > max_hosts + 2:
                raise TargetTooLargeError(
                    f"target subnet expands to {network.num_addresses:,} addresses, exceeding the maximum allowed size of {max_hosts} hosts (must be /24 or narrower)"
                )
        except ValueError as exc:
            if isinstance(exc, TargetTooLargeError):
                raise
            raise ValueError(f"invalid CIDR target: {target}") from exc

    candidates = expand_targets(target)
    if len(candidates) > max_hosts:
        raise TargetTooLargeError(
            f"target expands to {len(candidates)} hosts, exceeding the max of {max_hosts}"
        )



def _build_devices(scan_id: str, target: str, settings) -> list[Device]:
    discovered = discover_hosts(
        target=target,
        timeout=settings.scan_timeout_seconds,
        max_threads=settings.scan_max_threads,
        max_hosts=settings.scan_max_hosts,
    )
    arp_table = read_arp_table()
    devices: list[Device] = []
    for host in discovered:
        try:
            open_ports_raw = scan_host_ports(
                host.ip_address,
                settings.port_list,
                settings.scan_timeout_seconds,
                settings.scan_max_threads,
            )
            mac_address = arp_table.get(host.ip_address)
            device = Device(
                device_id=str(uuid.uuid4()),
                scan_id=scan_id,
                ip_address=host.ip_address,
                hostname=host.hostname,
                mac_address=mac_address,
                vendor=lookup_vendor(mac_address),
                open_ports=[
                    OpenPort(port=port.port, service=port.service, banner=port.banner)
                    for port in open_ports_raw
                ],
                discovered_at=datetime.now(timezone.utc).isoformat(),
            )
            devices.append(device)
        except Exception as exc:
            logger.warning(f"failed to fully process host {host.ip_address}: {exc}")
            continue
    return devices


def run_scan(scan_request: ScanRequest, max_hosts: int) -> dict:
    settings = get_settings()
    validate_target_size(scan_request.target, max_hosts)

    scan_id = str(uuid.uuid4())
    timestamp = datetime.now(timezone.utc).isoformat()

    devices = _build_devices(scan_id, scan_request.target, settings)

    firewall_rules = parse_firewall_config(scan_request.firewall_config_path)
    for rule in firewall_rules:
        rule.scan_id = scan_id
    firewall_context = parse_firewall_context(scan_request.firewall_config_path)

    cis_results, summary = run_all_checks(devices, firewall_rules, firewall_context, scan_id)

    db_success = True
    for device in devices:
        try:
            dynamo_client.put_device(device)
        except Exception as exc:
            db_success = False
            logger.error(f"failed to persist device {device.device_id}: {exc}")

    for rule in firewall_rules:
        try:
            dynamo_client.put_firewall_rule(rule)
        except Exception as exc:
            db_success = False
            logger.error(f"failed to persist firewall rule {rule.rule_id}: {exc}")

    for result in cis_results:
        try:
            dynamo_client.put_cis_result(result)
        except Exception as exc:
            db_success = False
            logger.error(f"failed to persist cis result {result.check_id}: {exc}")

    try:
        dynamo_client.put_scan_metadata(
            scan_id=scan_id,
            created_at=timestamp,
            target=scan_request.target,
            status="COMPLETED" if db_success else "PARTIAL",
            summary=summary,
        )
    except Exception as exc:
        db_success = False
        logger.error(f"failed to persist scan metadata {scan_id}: {exc}")

    is_local = settings.runtime_mode == "local"
    persistence = {

        "engine": "sqlite" if is_local else "dynamodb",
        "status": "local" if (is_local and db_success) else "synced" if db_success else "failed",
        "details": "Local SQLite Database" if is_local else f"AWS DynamoDB ({settings.aws_region})",
        "s3": "skipped" if is_local else "failed",
    }

    payload = {
        "scan_id": scan_id,
        "timestamp": timestamp,
        "devices": [device.model_dump(mode="json") for device in devices],
        "firewall_rules": [rule.model_dump(mode="json") for rule in firewall_rules],
        "cis_results": [result.model_dump(mode="json") for result in cis_results],
        "summary": summary,
        "persistence": persistence,
    }

    try:
        s3_client.archive_raw_result(scan_id, payload)
        persistence["s3"] = "synced"
    except Exception as exc:
        logger.warning(f"failed to archive raw result: {exc}")

    return payload

