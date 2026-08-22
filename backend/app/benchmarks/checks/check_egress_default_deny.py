from app.benchmarks.base_check import BaseCheck, CisCheckOutcome
from app.schemas.device import Device
from app.schemas.firewall_rule import FirewallRule


class EgressDefaultDenyCheck(BaseCheck):
    check_id = "check_egress_default_deny"
    title = "Explicit Default-Deny Egress Rule"
    cis_reference = "CIS Cisco IOS 16 Benchmark - Recommendation 2.2.6 (Egress filtering)"

    def run(self, devices: list[Device], firewall_rules: list[FirewallRule], firewall_context: dict) -> CisCheckOutcome:
        egress_rules = sorted(
            [rule for rule in firewall_rules if rule.direction == "egress"],
            key=lambda r: r.sequence,
        )

        if not egress_rules:
            return CisCheckOutcome(
                status="FAIL",
                evidence="No egress ACL rules were found; default-deny cannot be confirmed.",
                affected_items=[],
            )

        deny_all_index = None
        for idx, rule in enumerate(egress_rules):
            if (
                rule.action == "deny"
                and rule.source in ("any", "0.0.0.0/0")
                and rule.destination in ("any", "0.0.0.0/0")
                and rule.protocol in ("ip", "all")
            ):
                deny_all_index = idx
                break

        if deny_all_index is None:
            allow_all_egress = [
                rule for rule in egress_rules
                if rule.action == "permit"
                and rule.source in ("any", "0.0.0.0/0")
                and rule.destination in ("any", "0.0.0.0/0")
                and rule.protocol in ("ip", "all")
            ]
            return CisCheckOutcome(
                status="FAIL",
                evidence="Egress ACL allows all traffic with no explicit default-deny rule.",
                affected_items=[rule.raw_line for rule in allow_all_egress] if allow_all_egress else ["Missing explicit default-deny rule"],
            )


        permit_all_before_deny = [
            rule for rule in egress_rules[:deny_all_index]
            if rule.action == "permit"
            and rule.destination in ("any", "0.0.0.0/0")
            and rule.protocol in ("ip", "all")
            and rule.source in ("any", "0.0.0.0/0")
        ]

        if permit_all_before_deny:
            return CisCheckOutcome(
                status="FAIL",
                evidence="Egress ACL allows all traffic with a permit-all rule before the default-deny rule.",
                affected_items=[rule.raw_line for rule in permit_all_before_deny],
            )

        return CisCheckOutcome(status="PASS", evidence="Egress ACL has an explicit default-deny rule.")

