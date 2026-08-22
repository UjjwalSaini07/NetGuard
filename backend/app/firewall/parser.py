from pathlib import Path

from app.firewall import cisco_parser
from app.schemas.firewall_rule import FirewallRule

DEFAULT_CONFIG_PATH = Path(__file__).parent / "sample_configs" / "sample_cisco_ios.cfg"
HARDENED_CONFIG_PATH = Path(__file__).parent / "sample_configs" / "hardened_cisco_ios.cfg"


def load_config_text(config_path: str | None) -> str:
    if not config_path:
        path = DEFAULT_CONFIG_PATH
    elif config_path in ("hardened", "hardened_cisco_ios.cfg", "hardened_cisco_ios"):
        path = HARDENED_CONFIG_PATH
    elif config_path in ("legacy", "sample_cisco_ios.cfg", "sample_cisco_ios", "default"):
        path = DEFAULT_CONFIG_PATH
    else:
        path = Path(config_path)
    return path.read_text()


def parse_firewall_config(config_path: str | None = None) -> list[FirewallRule]:
    config_text = load_config_text(config_path)
    return cisco_parser.parse(config_text)


def parse_firewall_context(config_path: str | None = None) -> dict:
    config_text = load_config_text(config_path)
    lines = config_text.splitlines()
    return {
        "line_transports": cisco_parser.extract_line_transports(lines),
        "has_remote_syslog": cisco_parser.has_remote_syslog(lines),
        "has_ntp_server": cisco_parser.has_ntp_server(lines),
        "has_login_banner": cisco_parser.has_login_banner(lines),
    }

