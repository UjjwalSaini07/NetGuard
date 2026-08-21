import re

from app.benchmarks.base_check import BaseCheck, CisCheckOutcome
from app.schemas.device import Device
from app.schemas.firewall_rule import FirewallRule

DEFAULT_COMMUNITIES = {"public", "private"}
COMMUNITY_PATTERN = re.compile(r"snmp-server community (\S+)", re.IGNORECASE)


class WeakSnmpCommunityCheck(BaseCheck):
    check_id = "check_weak_snmp_community"
    title = "No Default SNMP Community Strings"
    cis_reference = "CIS Cisco IOS 16 Benchmark - Recommendation 2.4.1 (SNMP community strings)"

    def run(self, devices: list[Device], firewall_rules: list[FirewallRule], firewall_context: dict) -> CisCheckOutcome:
        affected: list[str] = []
        for rule in firewall_rules:
            if rule.protocol != "snmp":
                continue
            match = COMMUNITY_PATTERN.search(rule.raw_line)
            community = match.group(1).lower() if match else None
            if community in DEFAULT_COMMUNITIES:
                affected.append(rule.raw_line)

        if affected:
            return CisCheckOutcome(
                status="FAIL",
                evidence="Default SNMP community strings ('public'/'private') are configured.",
                affected_items=affected,
            )
        return CisCheckOutcome(status="PASS", evidence="No default SNMP community strings found.")
