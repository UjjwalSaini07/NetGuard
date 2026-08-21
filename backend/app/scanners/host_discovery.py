import ipaddress
import platform
import socket
import subprocess
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass, field

from app.logging_config import get_logger

logger = get_logger(__name__)

PROBE_PORTS = [80, 443, 22]


@dataclass
class DiscoveredHost:
    ip_address: str
    hostname: str | None = None


def expand_targets(target: str) -> list[str]:
    target = target.strip()
    if "/" in target:
        network = ipaddress.ip_network(target, strict=False)
        return [str(ip) for ip in network.hosts()]
    return [part.strip() for part in target.split(",") if part.strip()]


def _tcp_probe_reachable(ip_address: str, timeout: float) -> bool:
    for port in PROBE_PORTS:
        try:
            with socket.create_connection((ip_address, port), timeout=timeout):
                return True
        except OSError:
            continue
    return False


def _icmp_probe_reachable(ip_address: str, timeout: float) -> bool:
    count_flag = "-n" if platform.system().lower() == "windows" else "-c"
    timeout_ms = max(1, int(timeout * 1000))
    timeout_flag = "-w" if platform.system().lower() == "windows" else "-W"
    timeout_value = str(timeout_ms) if platform.system().lower() == "windows" else str(max(1, int(timeout)))
    try:
        result = subprocess.run(
            ["ping", count_flag, "1", timeout_flag, timeout_value, ip_address],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            timeout=timeout + 2,
        )
        return result.returncode == 0
    except Exception:
        return False


def _resolve_hostname(ip_address: str) -> str | None:
    try:
        return socket.gethostbyaddr(ip_address)[0]
    except Exception:
        return None


def probe_host(ip_address: str, timeout: float) -> DiscoveredHost | None:
    try:
        reachable = _tcp_probe_reachable(ip_address, timeout)
        if not reachable:
            reachable = _icmp_probe_reachable(ip_address, timeout)
        if not reachable:
            logger.debug(f"host unreachable: {ip_address}")
            return None
        return DiscoveredHost(ip_address=ip_address, hostname=_resolve_hostname(ip_address))
    except Exception as exc:
        logger.debug(f"probe failed for {ip_address}: {exc}")
        return None


def discover_hosts(target: str, timeout: float, max_threads: int, max_hosts: int) -> list[DiscoveredHost]:
    candidates = expand_targets(target)
    if len(candidates) > max_hosts:
        candidates = candidates[:max_hosts]

    discovered: list[DiscoveredHost] = []
    with ThreadPoolExecutor(max_workers=max(1, max_threads)) as executor:
        futures = {executor.submit(probe_host, ip, timeout): ip for ip in candidates}
        for future in as_completed(futures):
            try:
                host = future.result()
            except Exception as exc:
                logger.debug(f"discovery worker error for {futures[future]}: {exc}")
                continue
            if host is not None:
                discovered.append(host)
    return discovered
