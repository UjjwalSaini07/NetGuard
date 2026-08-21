from app.benchmarks.checks.check_egress_default_deny import EgressDefaultDenyCheck
from app.benchmarks.checks.check_insecure_mgmt_protocols import InsecureMgmtProtocolsCheck
from app.benchmarks.checks.check_no_default_credentials_banner import NoDefaultCredentialsBannerCheck
from app.benchmarks.checks.check_ntp_configured import NtpConfiguredCheck
from app.benchmarks.checks.check_open_ingress_sensitive_ports import OpenIngressSensitivePortsCheck
from app.benchmarks.checks.check_remote_syslog_enabled import RemoteSyslogEnabledCheck
from app.benchmarks.checks.check_ssh_only_mgmt import SshOnlyMgmtCheck
from app.benchmarks.checks.check_weak_snmp_community import WeakSnmpCommunityCheck
from app.firewall import parser
from app.schemas.device import Device, OpenPort
from app.schemas.firewall_rule import FirewallRule

EMPTY_CONTEXT = {
    "line_transports": ["ssh"],
    "has_remote_syslog": True,
    "has_ntp_server": True,
    "has_login_banner": True,
}


def _rule(**overrides):
    base = dict(
        rule_id="r1",
        scan_id="s1",
        source="any",
        destination="any",
        protocol="tcp",
        port="22",
        action="permit",
        direction="ingress",
        raw_line="permit tcp any any eq 22",
    )
    base.update(overrides)
    return FirewallRule(**base)


def _device(**overrides):
    base = dict(
        device_id="d1",
        scan_id="s1",
        ip_address="10.0.0.5",
        hostname=None,
        mac_address=None,
        vendor=None,
        open_ports=[],
        discovered_at="2026-01-01T00:00:00Z",
    )
    base.update(overrides)
    return Device(**base)


def test_insecure_mgmt_protocols_fails_on_telnet_device():
    device = _device(open_ports=[OpenPort(port=23, service="telnet")])
    outcome = InsecureMgmtProtocolsCheck().run([device], [], EMPTY_CONTEXT)
    assert outcome.status == "FAIL"


def test_insecure_mgmt_protocols_passes_when_clean():
    device = _device(open_ports=[OpenPort(port=22, service="ssh")])
    outcome = InsecureMgmtProtocolsCheck().run([device], [], EMPTY_CONTEXT)
    assert outcome.status == "PASS"


def test_ssh_only_mgmt_fails_on_telnet_transport():
    context = {**EMPTY_CONTEXT, "line_transports": ["ssh", "telnet"]}
    outcome = SshOnlyMgmtCheck().run([], [], context)
    assert outcome.status == "FAIL"


def test_ssh_only_mgmt_fails_on_ssh_scoped_to_non_management_subnet():
    rule = _rule(direction="ingress", action="permit", source="192.168.5.0/24", port="22")
    outcome = SshOnlyMgmtCheck().run([], [rule], EMPTY_CONTEXT)
    assert outcome.status == "FAIL"


def test_ssh_only_mgmt_passes_when_ssh_scoped_to_management_subnet():
    rule = _rule(direction="ingress", action="permit", source="10.10.0.0/24", port="22")
    outcome = SshOnlyMgmtCheck().run([], [rule], EMPTY_CONTEXT)
    assert outcome.status == "PASS"


def test_ssh_only_mgmt_passes_when_ssh_only():
    outcome = SshOnlyMgmtCheck().run([], [], EMPTY_CONTEXT)
    assert outcome.status == "PASS"


def test_weak_snmp_community_fails_on_public():
    rule = _rule(protocol="snmp", raw_line="snmp-server community public RO")
    outcome = WeakSnmpCommunityCheck().run([], [rule], EMPTY_CONTEXT)
    assert outcome.status == "FAIL"


def test_weak_snmp_community_passes_on_strong_string():
    rule = _rule(protocol="snmp", raw_line="snmp-server community X7q!strong RO")
    outcome = WeakSnmpCommunityCheck().run([], [rule], EMPTY_CONTEXT)
    assert outcome.status == "PASS"


def test_open_ingress_sensitive_ports_fails_on_any_to_22():
    rule = _rule(direction="ingress", action="permit", source="any", port="22")
    outcome = OpenIngressSensitivePortsCheck().run([], [rule], EMPTY_CONTEXT)
    assert outcome.status == "FAIL"


def test_open_ingress_sensitive_ports_passes_when_restricted():
    rule = _rule(direction="ingress", action="permit", source="10.10.0.0/24", port="22")
    outcome = OpenIngressSensitivePortsCheck().run([], [rule], EMPTY_CONTEXT)
    assert outcome.status == "PASS"


def test_egress_default_deny_fails_on_allow_all():
    rule = _rule(direction="egress", action="permit", destination="any", protocol="ip", port=None)
    outcome = EgressDefaultDenyCheck().run([], [rule], EMPTY_CONTEXT)
    assert outcome.status == "FAIL"


def test_egress_default_deny_passes_with_explicit_deny():
    rule = _rule(direction="egress", action="deny", destination="any", protocol="ip", port=None)
    outcome = EgressDefaultDenyCheck().run([], [rule], EMPTY_CONTEXT)
    assert outcome.status == "PASS"


def test_remote_syslog_fails_when_absent():
    context = {**EMPTY_CONTEXT, "has_remote_syslog": False}
    outcome = RemoteSyslogEnabledCheck().run([], [], context)
    assert outcome.status == "FAIL"


def test_remote_syslog_passes_when_present():
    outcome = RemoteSyslogEnabledCheck().run([], [], EMPTY_CONTEXT)
    assert outcome.status == "PASS"


def test_login_banner_fails_when_absent():
    context = {**EMPTY_CONTEXT, "has_login_banner": False}
    outcome = NoDefaultCredentialsBannerCheck().run([], [], context)
    assert outcome.status == "FAIL"


def test_login_banner_passes_when_present():
    outcome = NoDefaultCredentialsBannerCheck().run([], [], EMPTY_CONTEXT)
    assert outcome.status == "PASS"


def test_ntp_fails_when_absent():
    context = {**EMPTY_CONTEXT, "has_ntp_server": False}
    outcome = NtpConfiguredCheck().run([], [], context)
    assert outcome.status == "FAIL"


def test_ntp_passes_when_present():
    outcome = NtpConfiguredCheck().run([], [], EMPTY_CONTEXT)
    assert outcome.status == "PASS"


def test_all_checks_fail_against_bundled_insecure_sample_config():
    from app.benchmarks.engine import run_all_checks

    rules = parser.parse_firewall_config()
    context = parser.parse_firewall_context()
    results, summary = run_all_checks([], rules, context, "sample-scan")
    assert summary["total"] == 8
    assert summary["failed"] >= 6
