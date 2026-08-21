from app.benchmarks.base_check import BaseCheck, CisCheckOutcome
from app.schemas.device import Device
from app.schemas.firewall_rule import FirewallRule


class RemoteSyslogEnabledCheck(BaseCheck):
    check_id = "check_remote_syslog_enabled"
    title = "Remote Syslog Destination Configured"
    cis_reference = "CIS Cisco IOS 16 Benchmark - Recommendation 3.1.1 (logging host)"

    def run(self, devices: list[Device], firewall_rules: list[FirewallRule], firewall_context: dict) -> CisCheckOutcome:
        if firewall_context.get("has_remote_syslog"):
            return CisCheckOutcome(status="PASS", evidence="Remote syslog destination is configured.")
        return CisCheckOutcome(
            status="FAIL",
            evidence="No 'logging host <ip>' remote syslog destination found in configuration.",
            affected_items=["logging host <missing>"],
        )
