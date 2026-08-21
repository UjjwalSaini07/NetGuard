import platform
import re
import subprocess

from app.logging_config import get_logger

logger = get_logger(__name__)

OUI_VENDOR_MAP = {
    "00:1A:2B": "Cisco Systems",
    "00:0C:29": "VMware",
    "00:50:56": "VMware",
    "3C:5A:B4": "Google",
    "F4:5C:89": "Apple",
    "AC:DE:48": "Apple",
    "B8:27:EB": "Raspberry Pi Foundation",
    "DC:A6:32": "Raspberry Pi Foundation",
    "00:1B:63": "Apple",
    "00:16:3E": "Xensource",
    "00:15:5D": "Microsoft Hyper-V",
    "00:E0:4C": "Realtek",
    "00:D0:C9": "Intel",
    "00:1C:42": "Parallels",
    "08:00:27": "Oracle VirtualBox",
    "00:23:AE": "Cisco Systems",
    "00:24:97": "Cisco Systems",
    "70:B3:D5": "IEEE Registration Authority",
    "00:03:93": "Apple",
    "00:0D:93": "Apple",
    "00:1E:C2": "Apple",
    "3C:D9:2B": "Hewlett Packard",
    "00:1F:29": "Hewlett Packard",
    "00:26:B9": "Dell",
    "B8:CA:3A": "Dell",
    "00:14:22": "Dell",
    "F0:DE:F1": "Dell",
    "00:11:32": "Synology",
    "00:90:A9": "Western Digital",
    "18:66:DA": "Netgear",
    "A0:40:A0": "Netgear",
    "00:1D:7E": "Cisco-Linksys",
    "00:22:6B": "Cisco",
    "00:1F:33": "Netgear",
    "94:10:3E": "TP-Link",
    "50:C7:BF": "TP-Link",
    "EC:08:6B": "TP-Link",
}


def _normalize_prefix(mac_address: str) -> str:
    cleaned = mac_address.upper().replace("-", ":")
    parts = [p.zfill(2) for p in cleaned.split(":") if p]
    return ":".join(parts[:3])


def lookup_vendor(mac_address: str | None) -> str | None:
    if not mac_address:
        return None
    prefix = _normalize_prefix(mac_address)
    return OUI_VENDOR_MAP.get(prefix, "unknown")


def _parse_arp_output(raw_output: str) -> dict[str, str]:
    mapping: dict[str, str] = {}
    ip_mac_pattern = re.compile(
        r"\(?(\d{1,3}(?:\.\d{1,3}){3})\)?\s+.*?((?:[0-9a-fA-F]{1,2}[:-]){5}[0-9a-fA-F]{1,2})"
    )
    for line in raw_output.splitlines():
        match = ip_mac_pattern.search(line)
        if match:
            ip_address, raw_mac = match.group(1), match.group(2)
            parts = [p.zfill(2).upper() for p in raw_mac.replace("-", ":").split(":")]
            normalized_mac = ":".join(parts)
            mapping[ip_address] = normalized_mac
    return mapping


def read_arp_table() -> dict[str, str]:
    try:
        command = ["arp", "-a"]
        result = subprocess.run(command, capture_output=True, text=True, timeout=5)
        if result.returncode != 0:
            return {}
        return _parse_arp_output(result.stdout)
    except Exception as exc:
        logger.debug(f"arp table read failed: {exc}")
        return {}
