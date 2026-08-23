import ipaddress
from typing import Optional

from pydantic import BaseModel, Field, field_validator


class ScanRequest(BaseModel):
    target: str = Field(description="CIDR subnet or comma-separated IP list")
    firewall_config_path: Optional[str] = None

    @field_validator("target")
    @classmethod
    def target_not_blank(cls, value: str) -> str:
        if not value or not value.strip():
            raise ValueError("target must not be blank")
        cleaned = value.strip()
        if "/" in cleaned:
            try:
                network = ipaddress.ip_network(cleaned, strict=False)
                if network.prefixlen < 24:
                    raise ValueError(
                        f"subnet prefix /{network.prefixlen} is too wide ({network.num_addresses:,} hosts). "
                        f"Subnets must be /24 or narrower (e.g. /24 to /32, max 256 hosts) to prevent network and memory exhaustion."
                    )
            except ValueError as exc:
                raise ValueError(f"invalid CIDR target: {cleaned} - {exc}") from exc
        else:
            parts = [part.strip() for part in cleaned.split(",") if part.strip()]
            if not parts:
                raise ValueError("target list cannot be empty")
            for part in parts:
                try:
                    ipaddress.ip_address(part)
                except ValueError as exc:
                    raise ValueError(f"invalid IP address in target: {part}") from exc
        return cleaned



    @field_validator("firewall_config_path")
    @classmethod
    def validate_firewall_config_path(cls, value: str | None) -> str | None:
        if value is None or not value.strip():
            return None
        cleaned = value.strip().lower()
        allowed = (
            "advanced",
            "advanced_hardened",
            "advanced_hardened_cisco_ios.cfg",
            "advanced_hardened_cisco_ios",
            "enterprise_hardened",
            "hardened",
            "hardened_cisco_ios.cfg",
            "hardened_cisco_ios",
            "cis_hardened",
            "legacy",
            "sample_cisco_ios.cfg",
            "sample_cisco_ios",
            "sample",
            "default",
        )

        if cleaned not in allowed:
            raise ValueError(f"invalid firewall config profile: {value}")
        return cleaned



class ScanResult(BaseModel):
    scan_id: str
    timestamp: str
    devices: list
    firewall_rules: list
    cis_results: list
    summary: dict
