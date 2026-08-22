from app.scanners import host_discovery


def test_expand_targets_cidr():
    hosts = host_discovery.expand_targets("192.168.1.0/30")
    assert hosts == ["192.168.1.1", "192.168.1.2"]


def test_expand_targets_ip_list():
    hosts = host_discovery.expand_targets("10.0.0.1, 10.0.0.2,10.0.0.3")
    assert hosts == ["10.0.0.1", "10.0.0.2", "10.0.0.3"]


def test_expand_targets_invalid_ip():
    import pytest

    with pytest.raises(ValueError, match="invalid IP address"):
        host_discovery.expand_targets("999.999.999.999")
    with pytest.raises(ValueError, match="invalid IP address"):
        host_discovery.expand_targets("192.168.1.1, 300.1.1.1")


def test_expand_targets_invalid_cidr():
    import pytest

    with pytest.raises(ValueError, match="invalid CIDR"):
        host_discovery.expand_targets("192.168.1.0/35")



def test_discover_hosts_empty_subnet_returns_empty(monkeypatch):
    monkeypatch.setattr(host_discovery, "_tcp_probe_reachable", lambda ip, timeout: False)
    monkeypatch.setattr(host_discovery, "_icmp_probe_reachable", lambda ip, timeout: False)
    result = host_discovery.discover_hosts("192.168.55.0/30", timeout=0.1, max_threads=4, max_hosts=254)
    assert result == []


def test_discover_hosts_all_unreachable_no_exception(monkeypatch):
    def boom(ip, timeout):
        raise OSError("network unreachable")

    monkeypatch.setattr(host_discovery, "_tcp_probe_reachable", boom)
    monkeypatch.setattr(host_discovery, "_icmp_probe_reachable", lambda ip, timeout: False)
    result = host_discovery.discover_hosts("192.168.60.0/29", timeout=0.1, max_threads=4, max_hosts=254)
    assert result == []


def test_discover_hosts_respects_max_hosts(monkeypatch):
    monkeypatch.setattr(host_discovery, "_tcp_probe_reachable", lambda ip, timeout: True)
    monkeypatch.setattr(host_discovery, "_resolve_hostname", lambda ip: None)
    result = host_discovery.discover_hosts("192.168.1.0/24", timeout=0.1, max_threads=8, max_hosts=5)
    assert len(result) <= 5


def test_parse_arp_output_unix():
    from app.scanners.mac_vendor import _parse_arp_output, lookup_vendor
    sample_unix = "? (192.168.1.1) at 00:1a:2b:3c:4d:5e [ether] on eth0"
    parsed = _parse_arp_output(sample_unix)
    assert parsed.get("192.168.1.1") == "00:1A:2B:3C:4D:5E"
    assert lookup_vendor(parsed.get("192.168.1.1")) == "Cisco Systems"


def test_parse_arp_output_windows():
    from app.scanners.mac_vendor import _parse_arp_output, lookup_vendor
    sample_win = "  192.168.1.1           00-1a-2b-3c-4d-5e     dynamic"
    parsed = _parse_arp_output(sample_win)
    assert parsed.get("192.168.1.1") == "00:1A:2B:3C:4D:5E"
    assert lookup_vendor(parsed.get("192.168.1.1")) == "Cisco Systems"

