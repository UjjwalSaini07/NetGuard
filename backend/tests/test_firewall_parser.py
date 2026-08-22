from app.firewall import cisco_parser, parser


def test_parse_sample_config_extracts_rules():
    rules = parser.parse_firewall_config()
    assert len(rules) > 0
    assert any(rule.port == "23" for rule in rules)
    assert any(rule.protocol == "snmp" for rule in rules)


def test_sample_config_has_no_ssh_restriction_transport():
    context = parser.parse_firewall_context()
    assert "telnet" in [t.lower() for t in context["line_transports"]]


def test_sample_config_missing_syslog_ntp_banner():
    context = parser.parse_firewall_context()
    assert context["has_remote_syslog"] is False
    assert context["has_ntp_server"] is False
    assert context["has_login_banner"] is False


def test_cisco_parser_direction_classification():
    assert cisco_parser._direction_for_acl("ACL-INGRESS") == "ingress"
    assert cisco_parser._direction_for_acl("ACL-EGRESS") == "egress"


def test_cisco_parser_empty_config_returns_no_rules():
    assert cisco_parser.parse("") == []


def test_cisco_parser_captures_port_on_host_destination_syntax():
    config_text = (
        "ip access-list extended ACL-INGRESS\n"
        " permit tcp any host 10.10.0.1 eq 80\n"
    )
    rules = cisco_parser.parse(config_text)
    assert len(rules) == 1
    assert rules[0].destination == "10.10.0.1"
    assert rules[0].port == "80"


def test_cisco_parser_handles_host_to_host_with_port():
    config_text = (
        "ip access-list extended ACL-INGRESS\n"
        " permit tcp host 1.2.3.4 host 5.6.7.8 eq 443\n"
    )
    rules = cisco_parser.parse(config_text)
    assert rules[0].source == "1.2.3.4"
    assert rules[0].destination == "5.6.7.8"
    assert rules[0].port == "443"


def test_load_config_text_rejects_arbitrary_paths():
    import pytest

    with pytest.raises(ValueError):
        parser.load_config_text("/etc/hostname")

    with pytest.raises(ValueError):
        parser.load_config_text("../../etc/passwd")


def test_cisco_parser_handles_wildcard_mask_source():
    config_text = (
        "ip access-list extended ACL-INGRESS\n"
        " permit tcp 10.10.0.0 0.0.0.255 host 10.10.0.1 eq 22\n"
    )
    rules = cisco_parser.parse(config_text)
    assert len(rules) == 1
    assert rules[0].source == "10.10.0.0"
    assert rules[0].source_wildcard == "0.0.0.255"
    assert rules[0].destination == "10.10.0.1"
    assert rules[0].port == "22"


