from enum import Enum

from pydantic import BaseModel, Field


class CheckStatus(str, Enum):
    PASS = "PASS"
    FAIL = "FAIL"


class CisResult(BaseModel):
    check_id: str
    scan_id: str
    title: str
    cis_reference: str
    status: CheckStatus
    evidence: str
    affected_items: list[str] = Field(default_factory=list)


class CisSummary(BaseModel):
    total: int
    passed: int
    failed: int
