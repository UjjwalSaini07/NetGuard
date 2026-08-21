SERVICE_MAP = {
    21: "ftp",
    22: "ssh",
    23: "telnet",
    25: "smtp",
    53: "dns",
    80: "http",
    110: "pop3",
    143: "imap",
    161: "snmp",
    443: "https",
    445: "smb",
    3306: "mysql",
    3389: "rdp",
    5432: "postgresql",
    8080: "http",
}


def label_service(port: int, banner: str | None) -> str:
    if banner:
        lowered = banner.lower()
        if "ssh" in lowered:
            return "ssh"
        if "http" in lowered or lowered.startswith("<"):
            return "http"
        if "smtp" in lowered:
            return "smtp"
        if "ftp" in lowered:
            return "ftp"
    return SERVICE_MAP.get(port, "unknown")


def grab_banner(sock, port: int) -> str | None:
    try:
        if port in (80, 8080, 443):
            sock.sendall(b"HEAD / HTTP/1.0\r\n\r\n")
        data = sock.recv(256)
        if not data:
            return None
        return data.decode(errors="ignore").strip() or None
    except Exception:
        return None
