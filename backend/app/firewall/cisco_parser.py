import re
import uuid

from app.schemas.firewall_rule import FirewallRule

ACL_HEADER_PATTERN = re.compile(r"^ip access-list extended (\S+)")
ACL_ENTRY_ACTION_PATTERN = re.compile(r"^\s*(permit|deny)\s+(ip|tcp|udp|icmp)\s+(.+)$")
SNMP_COMMUNITY_PATTERN = re.compile(r"^snmp-server community (\S+)\s+(RO|RW)", re.IGNORECASE)
TRANSPORT_INPUT_PATTERN = re.compile(r"^\s*transport input (.+)")
LOGGING_HOST_PATTERN = re.compile(r"^logging host (\S+)")
NTP_SERVER_PATTERN = re.compile(r"^ntp server (\S+)")
BANNER_LOGIN_PATTERN = re.compile(r"^banner login")


def _direction_for_acl(acl_name: str) -> str:
    lowered = acl_name.lower()
    if "in" in lowered.replace("ingress", "in-gress"):
        return "ingress"
    if "egress" in lowered or "out" in lowered:
        return "egress"
    return "ingress"


def _consume_address(tokens: list[str], start: int) -> tuple[str, int]:
    if start < len(tokens) and tokens[start] == "host":
        return tokens[start + 1], start + 2
    return tokens[start], start + 1


def _parse_acl_entry_tail(action: str, protocol: str, remainder: str) -> tuple[str, str, str | None]:
    tokens = remainder.split()
    source, next_index = _consume_address(tokens, 0)
    destination, next_index = _consume_address(tokens, next_index)
    port = None
    if next_index < len(tokens) and tokens[next_index] == "eq":
        port = tokens[next_index + 1]
    return source, destination, port


def _parse_acl_entries(lines: list[str]) -> list[FirewallRule]:
    rules: list[FirewallRule] = []
    current_acl = None
    for raw_line in lines:
        header_match = ACL_HEADER_PATTERN.match(raw_line)
        if header_match:
            current_acl = header_match.group(1)
            continue
        if current_acl is None:
            continue
        if raw_line.startswith("ip access-list") or (raw_line and not raw_line.startswith(" ") and not raw_line.startswith("!")):
            current_acl = None
            continue
        entry_match = ACL_ENTRY_ACTION_PATTERN.match(raw_line)
        if not entry_match:
            continue
        action, protocol, remainder = entry_match.groups()
        try:
            source, destination, port = _parse_acl_entry_tail(action, protocol, remainder)
        except IndexError:
            continue
        rules.append(
            FirewallRule(
                rule_id=str(uuid.uuid4()),
                scan_id="",
                source=source,
                destination=destination or "any",
                protocol=protocol,
                port=port,
                action=action,
                direction=_direction_for_acl(current_acl),
                raw_line=raw_line.strip(),
            )
        )
    return rules


def _parse_snmp_communities(lines: list[str]) -> list[FirewallRule]:
    rules: list[FirewallRule] = []
    for raw_line in lines:
        match = SNMP_COMMUNITY_PATTERN.match(raw_line.strip())
        if match:
            rules.append(
                FirewallRule(
                    rule_id=str(uuid.uuid4()),
                    scan_id="",
                    source="any",
                    destination="device",
                    protocol="snmp",
                    port="161",
                    action="permit",
                    direction="ingress",
                    raw_line=raw_line.strip(),
                )
            )
    return rules


def extract_line_transports(lines: list[str]) -> list[str]:
    transports: list[str] = []
    for raw_line in lines:
        match = TRANSPORT_INPUT_PATTERN.match(raw_line)
        if match:
            transports.extend(match.group(1).split())
    return transports


def has_remote_syslog(lines: list[str]) -> bool:
    return any(LOGGING_HOST_PATTERN.match(raw_line.strip()) for raw_line in lines)


def has_ntp_server(lines: list[str]) -> bool:
    return any(NTP_SERVER_PATTERN.match(raw_line.strip()) for raw_line in lines)


def has_login_banner(lines: list[str]) -> bool:
    return any(BANNER_LOGIN_PATTERN.match(raw_line.strip()) for raw_line in lines)


def parse(config_text: str) -> list[FirewallRule]:
    lines = config_text.splitlines()
    rules = _parse_acl_entries(lines)
    rules.extend(_parse_snmp_communities(lines))
    return rules
