from pathlib import Path

from app.firewall import cisco_parser
from app.schemas.firewall_rule import FirewallRule

DEFAULT_CONFIG_PATH = Path(__file__).parent / "sample_configs" / "sample_cisco_ios.cfg"
HARDENED_CONFIG_PATH = Path(__file__).parent / "sample_configs" / "hardened_cisco_ios.cfg"
ADVANCED_HARDENED_CONFIG_PATH = Path(__file__).parent / "sample_configs" / "advanced_hardened_cisco_ios.cfg"


ALLOWED_CONFIG_PROFILES = {
    "advanced": ADVANCED_HARDENED_CONFIG_PATH,
    "advanced_hardened": ADVANCED_HARDENED_CONFIG_PATH,
    "advanced_hardened_cisco_ios.cfg": ADVANCED_HARDENED_CONFIG_PATH,
    "advanced_hardened_cisco_ios": ADVANCED_HARDENED_CONFIG_PATH,
    "enterprise_hardened": ADVANCED_HARDENED_CONFIG_PATH,
    "hardened": HARDENED_CONFIG_PATH,
    "hardened_cisco_ios.cfg": HARDENED_CONFIG_PATH,
    "hardened_cisco_ios": HARDENED_CONFIG_PATH,
    "cis_hardened": HARDENED_CONFIG_PATH,
    "legacy": DEFAULT_CONFIG_PATH,
    "sample_cisco_ios.cfg": DEFAULT_CONFIG_PATH,
    "sample_cisco_ios": DEFAULT_CONFIG_PATH,
    "sample": DEFAULT_CONFIG_PATH,
    "default": DEFAULT_CONFIG_PATH,
}



def load_config_text(config_path: str | None = None) -> str:
    if not config_path:
        path = DEFAULT_CONFIG_PATH
    else:
        normalized = config_path.strip().lower()
        if normalized in ALLOWED_CONFIG_PROFILES:
            path = ALLOWED_CONFIG_PROFILES[normalized]
        else:
            raise ValueError(f"invalid firewall config profile: {config_path}")
    return path.read_text(encoding="utf-8")



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

