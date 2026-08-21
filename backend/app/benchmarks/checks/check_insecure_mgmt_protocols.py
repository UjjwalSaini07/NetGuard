from app.benchmarks.base_check import BaseCheck, CisCheckOutcome
from app.schemas.device import Device
from app.schemas.firewall_rule import FirewallRule

INSECURE_SERVICES = {"telnet", "ftp", "http", "snmp"}
INSECURE_PORTS = {"23", "21", "80", "161"}


class InsecureMgmtProtocolsCheck(BaseCheck):
    check_id = "check_insecure_mgmt_protocols"
    title = "Insecure Management Protocols Disabled"
    cis_reference = "CIS Cisco IOS 16 Benchmark - Recommendation 2.3.1 (Telnet/FTP/HTTP/SNMPv1-v2c)"

    def run(self, devices: list[Device], firewall_rules: list[FirewallRule], firewall_context: dict) -> CisCheckOutcome:
        affected: list[str] = []

        for device in devices:
            for open_port in device.open_ports:
                if open_port.service in INSECURE_SERVICES:
                    affected.append(f"{device.ip_address}:{open_port.port}/{open_port.service}")

        for rule in firewall_rules:
            if rule.action == "permit" and (rule.port in INSECURE_PORTS or rule.protocol == "snmp"):
                affected.append(f"firewall-rule:{rule.raw_line}")

        if affected:
            return CisCheckOutcome(
                status="FAIL",
                evidence="Insecure management protocols (Telnet/FTP/HTTP/SNMPv1-v2c) detected open or permitted.",
                affected_items=affected,
            )
        return CisCheckOutcome(status="PASS", evidence="No insecure management protocols detected.")
