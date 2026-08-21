import socket
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass

from app.logging_config import get_logger
from app.scanners.service_detector import grab_banner, label_service

logger = get_logger(__name__)


@dataclass
class OpenPortResult:
    port: int
    service: str
    banner: str | None


def _scan_port(ip_address: str, port: int, timeout: float) -> OpenPortResult | None:
    try:
        with socket.create_connection((ip_address, port), timeout=timeout) as sock:
            sock.settimeout(timeout)
            banner = grab_banner(sock, port)
            service = label_service(port, banner)
            return OpenPortResult(port=port, service=service, banner=banner)
    except OSError:
        return None
    except Exception as exc:
        logger.debug(f"port scan error {ip_address}:{port}: {exc}")
        return None


def scan_host_ports(ip_address: str, ports: list[int], timeout: float, max_threads: int) -> list[OpenPortResult]:
    results: list[OpenPortResult] = []
    with ThreadPoolExecutor(max_workers=max(1, min(max_threads, len(ports) or 1))) as executor:
        futures = [executor.submit(_scan_port, ip_address, port, timeout) for port in ports]
        for future in as_completed(futures):
            try:
                outcome = future.result()
            except Exception as exc:
                logger.debug(f"port scan worker error for {ip_address}: {exc}")
                continue
            if outcome is not None:
                results.append(outcome)
    return sorted(results, key=lambda item: item.port)
