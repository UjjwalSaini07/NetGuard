from abc import ABC, abstractmethod
from dataclasses import dataclass, field

from app.schemas.device import Device
from app.schemas.firewall_rule import FirewallRule


@dataclass
class CisCheckOutcome:
    status: str
    evidence: str
    affected_items: list[str] = field(default_factory=list)


class BaseCheck(ABC):
    check_id: str = ""
    title: str = ""
    cis_reference: str = ""

    @abstractmethod
    def run(
        self,
        devices: list[Device],
        firewall_rules: list[FirewallRule],
        firewall_context: dict,
    ) -> CisCheckOutcome:
        raise NotImplementedError
