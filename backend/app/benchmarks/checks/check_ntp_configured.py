from app.benchmarks.base_check import BaseCheck, CisCheckOutcome
from app.schemas.device import Device
from app.schemas.firewall_rule import FirewallRule


class NtpConfiguredCheck(BaseCheck):
    check_id = "check_ntp_configured"
    title = "NTP Time Synchronization Configured"
    cis_reference = "CIS Cisco IOS 16 Benchmark - Recommendation 3.2.1 (ntp server)"

    def run(self, devices: list[Device], firewall_rules: list[FirewallRule], firewall_context: dict) -> CisCheckOutcome:
        if firewall_context.get("has_ntp_server"):
            return CisCheckOutcome(status="PASS", evidence="NTP server is configured for time synchronization.")
        return CisCheckOutcome(
            status="FAIL",
            evidence="No 'ntp server' configuration found; log timestamp accuracy cannot be guaranteed.",
            affected_items=["ntp server <missing>"],
        )
