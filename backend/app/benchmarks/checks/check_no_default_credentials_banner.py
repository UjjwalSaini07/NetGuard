from app.benchmarks.base_check import BaseCheck, CisCheckOutcome
from app.schemas.device import Device
from app.schemas.firewall_rule import FirewallRule


class NoDefaultCredentialsBannerCheck(BaseCheck):
    check_id = "check_no_default_credentials_banner"
    title = "Login Warning Banner Configured"
    cis_reference = "CIS Cisco IOS 16 Benchmark - Recommendation 1.1.7 (banner login)"

    def run(self, devices: list[Device], firewall_rules: list[FirewallRule], firewall_context: dict) -> CisCheckOutcome:
        if firewall_context.get("has_login_banner"):
            return CisCheckOutcome(status="PASS", evidence="A login warning banner is configured.")
        return CisCheckOutcome(
            status="FAIL",
            evidence="No 'banner login' warning block found in configuration.",
            affected_items=["banner login <missing>"],
        )
