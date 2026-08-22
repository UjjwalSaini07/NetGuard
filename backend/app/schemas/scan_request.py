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
        return value.strip()

    @field_validator("firewall_config_path")
    @classmethod
    def validate_firewall_config_path(cls, value: str | None) -> str | None:
        if value is None or not value.strip():
            return None
        cleaned = value.strip().lower()
        allowed = (
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
