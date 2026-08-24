import ipaddress

from app.benchmarks.base_check import BaseCheck, CisCheckOutcome
from app.config import get_settings
from app.schemas.device import Device
from app.schemas.firewall_rule import FirewallRule


def _source_within_management_subnet(source: str, mgmt_subnet: ipaddress.IPv4Network | ipaddress.IPv6Network, wildcard: str | None = None) -> bool:
    if source in ("any", "0.0.0.0/0"):
        return False
    try:
        if "/" in source:
            network = ipaddress.ip_network(source, strict=False)
            return network.subnet_of(mgmt_subnet) or network == mgmt_subnet
        if wildcard:
            try:
                wildcard_octets = [int(o) for o in wildcard.split(".")]
                netmask_octets = [255 - o for o in wildcard_octets]
                netmask = ".".join(str(o) for o in netmask_octets)
                network = ipaddress.ip_network(f"{source}/{netmask}", strict=False)
                return network.subnet_of(mgmt_subnet) or network == mgmt_subnet
            except Exception:
                pass
        return ipaddress.ip_address(source) in mgmt_subnet
    except ValueError:
        return False



class SshOnlyMgmtCheck(BaseCheck):
    check_id = "check_ssh_only_mgmt"
    title = "SSH-Only Remote Management"
    cis_reference = "CIS Cisco IOS 16 Benchmark - Recommendation 2.3.5 (transport input ssh)"

    def run(self, devices: list[Device], firewall_rules: list[FirewallRule], firewall_context: dict) -> CisCheckOutcome:
        affected: list[str] = []

        try:
            mgmt_subnet = ipaddress.ip_network(get_settings().management_subnet, strict=False)
        except Exception:
            mgmt_subnet = ipaddress.ip_network("10.10.0.0/24")

        transports = firewall_context.get("line_transports", [])
        non_ssh_transports = [item for item in transports if item.lower() not in ("ssh", "none")]
        if non_ssh_transports:

            affected.append(f"line vty transport input includes: {', '.join(sorted(set(non_ssh_transports)))}")

        for rule in firewall_rules:
            if rule.action != "permit" or rule.port != "22":
                continue
            if not _source_within_management_subnet(rule.source, mgmt_subnet, rule.source_wildcard):
                affected.append(f"ssh reachable outside management subnet: {rule.raw_line}")


        for device in devices:
            other_mgmt_ports = {21, 23, 3389}
            for open_port in device.open_ports:
                if open_port.port in other_mgmt_ports:
                    affected.append(f"{device.ip_address}:{open_port.port}/{open_port.service}")

        if affected:
            return CisCheckOutcome(
                status="FAIL",
                evidence="Remote management is not restricted to SSH from the management subnet only.",
                affected_items=affected,
            )
        return CisCheckOutcome(status="PASS", evidence="Remote management is SSH-only and properly restricted.")

