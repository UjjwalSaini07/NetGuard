from app.benchmarks.base_check import BaseCheck
from app.benchmarks.checks.check_egress_default_deny import EgressDefaultDenyCheck
from app.benchmarks.checks.check_insecure_mgmt_protocols import InsecureMgmtProtocolsCheck
from app.benchmarks.checks.check_no_default_credentials_banner import NoDefaultCredentialsBannerCheck
from app.benchmarks.checks.check_ntp_configured import NtpConfiguredCheck
from app.benchmarks.checks.check_open_ingress_sensitive_ports import OpenIngressSensitivePortsCheck
from app.benchmarks.checks.check_remote_syslog_enabled import RemoteSyslogEnabledCheck
from app.benchmarks.checks.check_ssh_only_mgmt import SshOnlyMgmtCheck
from app.benchmarks.checks.check_weak_snmp_community import WeakSnmpCommunityCheck
from app.schemas.cis_result import CisResult
from app.schemas.device import Device
from app.schemas.firewall_rule import FirewallRule

REGISTERED_CHECKS: list[type[BaseCheck]] = [
    InsecureMgmtProtocolsCheck,
    SshOnlyMgmtCheck,
    WeakSnmpCommunityCheck,
    OpenIngressSensitivePortsCheck,
    EgressDefaultDenyCheck,
    RemoteSyslogEnabledCheck,
    NoDefaultCredentialsBannerCheck,
    NtpConfiguredCheck,
]


def run_all_checks(
    devices: list[Device],
    firewall_rules: list[FirewallRule],
    firewall_context: dict,
    scan_id: str,
) -> tuple[list[CisResult], dict]:
    results: list[CisResult] = []
    for check_cls in REGISTERED_CHECKS:
        check_instance = check_cls()
        outcome = check_instance.run(devices, firewall_rules, firewall_context)
        results.append(
            CisResult(
                check_id=check_instance.check_id,
                scan_id=scan_id,
                title=check_instance.title,
                cis_reference=check_instance.cis_reference,
                status=outcome.status,
                evidence=outcome.evidence,
                affected_items=outcome.affected_items,
            )
        )

    passed = sum(1 for result in results if result.status == "PASS")
    summary = {"total": len(results), "passed": passed, "failed": len(results) - passed}
    return results, summary
