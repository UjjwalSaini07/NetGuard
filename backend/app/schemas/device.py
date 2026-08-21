from typing import Optional

from pydantic import BaseModel, Field


class OpenPort(BaseModel):
    port: int
    service: str
    banner: Optional[str] = None


class Device(BaseModel):
    device_id: str
    scan_id: str
    ip_address: str
    hostname: Optional[str] = None
    mac_address: Optional[str] = None
    vendor: Optional[str] = None
    open_ports: list[OpenPort] = Field(default_factory=list)
    discovered_at: str
