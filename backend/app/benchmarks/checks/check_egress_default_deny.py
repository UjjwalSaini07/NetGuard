from app.benchmarks.base_check import BaseCheck, CisCheckOutcome
from app.schemas.device import Device
from app.schemas.firewall_rule import FirewallRule


class EgressDefaultDenyCheck(BaseCheck):
    check_id = "check_egress_default_deny"
    title = "Explicit Default-Deny Egress Rule"
    cis_reference = "CIS Cisco IOS 16 Benchmark - Recommendation 2.2.6 (Egress filtering)"

    def run(self, devices: list[Device], firewall_rules: list[FirewallRule], firewall_context: dict) -> CisCheckOutcome:
        egress_rules = [rule for rule in firewall_rules if rule.direction == "egress"]
        has_default_deny = any(
            rule.action == "deny" and rule.destination in ("any", "0.0.0.0/0") for rule in egress_rules
        )
        allow_all_egress = [
            rule for rule in egress_rules
            if rule.action == "permit" and rule.destination in ("any", "0.0.0.0/0") and rule.protocol == "ip"
        ]

        if not has_default_deny and allow_all_egress:
            return CisCheckOutcome(
                status="FAIL",
                evidence="Egress ACL allows all traffic with no explicit default-deny rule.",
                affected_items=[rule.raw_line for rule in allow_all_egress],
            )
        if not egress_rules:
            return CisCheckOutcome(
                status="FAIL",
                evidence="No egress ACL rules were found; default-deny cannot be confirmed.",
                affected_items=[],
            )
        return CisCheckOutcome(status="PASS", evidence="Egress ACL has an explicit default-deny rule.")
