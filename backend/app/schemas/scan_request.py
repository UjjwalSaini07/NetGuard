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


class ScanResult(BaseModel):
    scan_id: str
    timestamp: str
    devices: list
    firewall_rules: list
    cis_results: list
    summary: dict
