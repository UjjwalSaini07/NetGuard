from typing import Optional

from pydantic import BaseModel


class FirewallRule(BaseModel):
    rule_id: str
    scan_id: str
    source: str
    destination: str
    protocol: str
    port: Optional[str] = None
    action: str
    direction: str
    raw_line: str
