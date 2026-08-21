from app.benchmarks.base_check import BaseCheck, CisCheckOutcome
from app.schemas.device import Device
from app.schemas.firewall_rule import FirewallRule

SENSITIVE_PORTS = {"22", "23", "3389", "445", "3306", "5432"}


class OpenIngressSensitivePortsCheck(BaseCheck):
    check_id = "check_open_ingress_sensitive_ports"
    title = "No Unrestricted Ingress to Sensitive Ports"
    cis_reference = "CIS Cisco IOS 16 Benchmark - Recommendation 2.2.3 (Ingress ACL restrictions)"

    def run(self, devices: list[Device], firewall_rules: list[FirewallRule], firewall_context: dict) -> CisCheckOutcome:
        affected: list[str] = []
        for rule in firewall_rules:
            if rule.direction != "ingress" or rule.action != "permit":
                continue
            if rule.source in ("any", "0.0.0.0/0") and rule.port in SENSITIVE_PORTS:
                affected.append(rule.raw_line)

        if affected:
            return CisCheckOutcome(
                status="FAIL",
                evidence="Ingress ACL permits 'any' source to sensitive management/database ports.",
                affected_items=affected,
            )
        return CisCheckOutcome(status="PASS", evidence="No unrestricted ingress to sensitive ports found.")
