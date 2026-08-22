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


IPV4_OCTET_PATTERN = re.compile(r"^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$")


def _is_dotted_quad(token: str) -> bool:
    if not IPV4_OCTET_PATTERN.match(token):
        return False
    parts = token.split(".")
    return all(0 <= int(p) <= 255 for p in parts)


def _direction_for_acl(acl_name: str) -> str:
    lowered = acl_name.lower()
    if "in" in lowered.replace("ingress", "in-gress"):
        return "ingress"
    if "egress" in lowered or "out" in lowered:
        return "egress"
    return "ingress"


def _consume_address(tokens: list[str], start: int) -> tuple[str, str | None, int]:
    if start >= len(tokens):
        return "any", None, start

    if tokens[start] == "host":
        if start + 1 < len(tokens):
            return tokens[start + 1], None, start + 2
        return "any", None, start + 1

    if tokens[start] in ("any", "any4"):
        return "any", None, start + 1

    addr = tokens[start]
    wildcard = None
    next_idx = start + 1

    if _is_dotted_quad(addr):
        if next_idx < len(tokens) and _is_dotted_quad(tokens[next_idx]) and tokens[next_idx] not in ("host", "eq", "range", "gt", "lt", "neq", "log", "established"):
            wildcard = tokens[next_idx]
            next_idx += 1

    return addr, wildcard, next_idx


def _parse_acl_entry_tail(action: str, protocol: str, remainder: str) -> tuple[str, str | None, str, str | None, str | None]:
    tokens = remainder.split()
    source, src_wildcard, next_index = _consume_address(tokens, 0)
    destination, dst_wildcard, next_index = _consume_address(tokens, next_index)
    port = None
    if next_index < len(tokens) and tokens[next_index] == "eq":
        port = tokens[next_index + 1]
    return source, src_wildcard, destination, dst_wildcard, port


def _parse_acl_entries(lines: list[str]) -> list[FirewallRule]:
    rules: list[FirewallRule] = []
    current_acl = None
    seq = 0
    for raw_line in lines:
        header_match = ACL_HEADER_PATTERN.match(raw_line)
        if header_match:
            current_acl = header_match.group(1)
            seq = 0
            continue
        if current_acl is None:
            continue
        if raw_line.startswith("ip access-list") or (raw_line and not raw_line.startswith(" ") and not raw_line.startswith("!")):
            current_acl = None
            seq = 0
            continue
        entry_match = ACL_ENTRY_ACTION_PATTERN.match(raw_line)
        if not entry_match:
            continue
        action, protocol, remainder = entry_match.groups()
        try:
            source, src_wildcard, destination, dst_wildcard, port = _parse_acl_entry_tail(action, protocol, remainder)
        except IndexError:
            continue
        seq += 10
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
                sequence=seq,
                source_wildcard=src_wildcard,
                destination_wildcard=dst_wildcard,
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
