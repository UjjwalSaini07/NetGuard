import socket

from app.scanners import port_scanner


def test_scan_host_ports_returns_empty_when_all_closed(monkeypatch):
    def fail_connect(*args, **kwargs):
        raise OSError("connection refused")

    monkeypatch.setattr(socket, "create_connection", fail_connect)
    results = port_scanner.scan_host_ports("127.0.0.1", [65000, 65001], timeout=0.1, max_threads=4)
    assert results == []


def test_scan_host_ports_sorted_by_port(monkeypatch):
    class FakeSocket:
        def __init__(self, port):
            self.port = port

        def __enter__(self):
            return self

        def __exit__(self, *args):
            return False

        def settimeout(self, value):
            return None

        def recv(self, size):
            return b""

        def sendall(self, data):
            return None

    def fake_connect(address, timeout=None):
        return FakeSocket(address[1])

    monkeypatch.setattr(socket, "create_connection", fake_connect)
    results = port_scanner.scan_host_ports("127.0.0.1", [443, 22, 80], timeout=0.1, max_threads=4)
    assert [r.port for r in results] == [22, 80, 443]
    assert results[0].service == "ssh"
