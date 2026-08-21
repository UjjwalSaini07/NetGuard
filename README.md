# NetGuard

NetGuard discovers devices and firewall configurations in a target environment, evaluates them against CIS Cisco IOS Benchmark recommendations, ships the results to AWS, exposes them via a REST API, and visualizes them in a React dashboard.

## Architecture

```
                         +-------------------------+
                         |   React Dashboard (Vite) |
                         |  Devices / Firewall / CIS|
                         +-----------+--------------+
                                     | HTTPS (x-api-key)
                                     v
                         +-------------------------+
                         |   API Gateway (HTTP API) |
                         +-----------+--------------+
                                     v
                         +-------------------------+
                         |  Lambda (FastAPI+Mangum) |
                         |  /scan /devices          |
                         |  /firewall-rules         |
                         |  /cis-results  /health   |
                         +-----+---------------+----+
                               |               |
                 orchestrator  |               |  boto3
                               v               v
     +----------------------------+   +--------------------+
     | scan_orchestrator.run_scan |   |     DynamoDB        |
     |  1. host_discovery         |   |  Devices            |
     |  2. port_scanner           |   |  FirewallRules      |
     |  3. service_detector       |   |  CisResults         |
     |  4. mac_vendor              |  |  (scan_id + sort key)|
     |  5. cisco_parser (ACL cfg) |   +--------------------+
     |  6. benchmarks/engine.py   |
     |     (8 CIS checks)         |          optional
     +----------------------------+             |
                               \-----------------v
                                          +-------------+
                                          |  S3 (raw    |
                                          |  JSON archive)|
                                          +-------------+
```

Local development runs the same FastAPI app with `uvicorn` instead of Lambda — no code branching beyond the `RUNTIME_MODE` env var that governs scan-size limits (see below).

## Repository layout

```
netguard/
├── backend/    FastAPI app, scanners, firewall parser, CIS benchmark engine, AWS clients, SAM template
└── frontend/   Vite + React + Tailwind dashboard
```

## Backend — local setup

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# edit .env — set NETGUARD_API_KEY to any value you like locally
./run_local.sh
```

This starts `uvicorn app.main:app --reload --port 8000`. Interactive API docs are at `http://localhost:8000/docs`.

Run the test suite:

```bash
pytest
```

The suite covers: host discovery edge cases (empty subnet, all-unreachable, thread-safety of the `ThreadPoolExecutor` path), firewall parsing correctness against the bundled sample Cisco IOS config, all 8 CIS checks firing PASS **and** FAIL on crafted fixtures, API route status codes and `x-api-key` auth rejection, and the `local` vs `lambda` scan-size limiting behavior of `POST /scan`.

## Frontend — local setup

```bash
cd frontend
npm install
cp .env.example .env
# edit .env — VITE_API_BASE_URL and VITE_API_KEY must match the backend
npm run dev
```

Vite serves the dashboard on `http://localhost:5173`.

## Deploying to AWS

Requires the AWS CLI and AWS SAM CLI configured with credentials that can create Lambda, API Gateway, IAM roles, and DynamoDB tables.

```bash
cd backend
export NETGUARD_API_KEY="a-strong-random-value"
export AWS_REGION="us-east-1"
./deploy.sh
```

`deploy.sh` runs `sam build` then `sam deploy --guided`, which walks through stack name, region, and confirmation prompts once and remembers them in `samconfig.toml` for subsequent deploys. No manual console steps are required beyond those prompts.

`template.yaml` provisions:
- One Lambda function (`app.lambda_handler.handler`, `RUNTIME_MODE=lambda`) behind an API Gateway HTTP API with proxy integration
- Three DynamoDB tables, all on-demand billing

### DynamoDB schema — why composite keys

| Table | Partition key | Sort key | Reasoning |
|---|---|---|---|
| `NetGuardDevices` | `scan_id` | `device_id` | A single scan discovers many devices; each must be independently addressable within that scan without overwriting siblings. |
| `NetGuardFirewallRules` | `scan_id` | `rule_id` | Same reasoning — many parsed ACL entries per scan. |
| `NetGuardCisResults` | `scan_id` | `check_id` | Many checks per scan. `check_id` is stable across scans (e.g. `check_ssh_only_mgmt`), which also makes "how did check X trend across scans" a straightforward future query via a GSI on `check_id`. |

A bare `id`/`scan_id`-only key would let a second device/rule/check from the same scan silently overwrite the first — the composite key is what makes multi-item persistence per scan correct.

## CIS Cisco IOS Benchmark mapping

Every check maps to one CIS Cisco IOS Benchmark recommendation area, stored as a class attribute (`cis_reference`) on the check itself, not a comment:

| Check | Fails when | CIS reference |
|---|---|---|
| `check_insecure_mgmt_protocols` | Telnet/FTP/HTTP/SNMPv1-v2c open or permitted | Recommendation 2.3.1 |
| `check_ssh_only_mgmt` | Any non-SSH management transport, or SSH reachable outside the management subnet | Recommendation 2.3.5 |
| `check_weak_snmp_community` | SNMP community string is `public`/`private` | Recommendation 2.4.1 |
| `check_open_ingress_sensitive_ports` | Ingress ACL permits `any` to 22/23/3389/445/3306/5432 | Recommendation 2.2.3 |
| `check_egress_default_deny` | No explicit default-deny egress rule | Recommendation 2.2.6 |
| `check_remote_syslog_enabled` | No `logging host <ip>` configured | Recommendation 3.1.1 |
| `check_no_default_credentials_banner` | No `banner login` block | Recommendation 1.1.7 |
| `check_ntp_configured` | No `ntp server` configured | Recommendation 3.2.1 |

The bundled `app/firewall/sample_configs/sample_cisco_ios.cfg` is deliberately insecure — it trips all 8 checks — so a fresh scan against the default sample demonstrates every FAIL path without any additional setup.

## Design decision: local-synchronous vs Lambda-bounded scanning

`POST /scan` runs the same synchronous orchestrator in both modes, but `RUNTIME_MODE` changes the size ceiling:

- **`local`** (default for `run_local.sh`): bounded only by `SCAN_MAX_HOSTS` (default 254 — a full `/24`), since a local `uvicorn` process has no API Gateway timeout.
- **`lambda`**: API Gateway HTTP API integrations time out at 29 seconds and Lambda itself caps at 15 minutes, so a full subnet sweep is unsafe to run synchronously inside a single invocation. The route instead validates the target against `SCAN_MAX_HOSTS_LAMBDA` (default 16) up front and returns `422` with a clear message if the target is too large, rather than discovering the whole range and then giving up partway through.

**Out of scope for this MVP, left as a follow-up:** an async pattern where API Gateway → Lambda enqueues to SQS → a longer-running worker Lambda executes the full scan → results land in DynamoDB → the frontend polls `/cis-results` or a future `/scan-status/{scan_id}` endpoint. The orchestrator (`scan_orchestrator.run_scan`) is already decoupled from the route handler specifically so this is a drop-in follow-up rather than a rewrite — the route would enqueue instead of calling `run_scan` directly, and a second worker Lambda would import the same `run_scan` function unchanged.

## Demo script

Talking points for walking through NetGuard end-to-end:

1. **Discovery logic + non-responsive host handling** — `host_discovery.py` expands a CIDR or IP list, probes each candidate with a threaded TCP connect attempt against a small probe-port set, and falls back to an OS ping only if all TCP probes fail. Every probe is wrapped so a single bad host (firewalled, filtered, DNS failure) is logged at debug level and excluded — it never raises out of the thread pool and never aborts the rest of the sweep.
2. **Benchmark checks and evaluation method** — each of the 8 checks is a small class implementing `BaseCheck.run(devices, firewall_rules, firewall_context) -> CisCheckOutcome`, returning PASS/FAIL, human-readable evidence, and the specific offending lines/ports as `affected_items`. The engine runs a static, explicit registry (not filesystem reflection) so the check list is predictable and testable in isolation.
3. **AWS data flow** — `scan_orchestrator.run_scan` is the single entrypoint: discovery → port scan → service/vendor enrichment → firewall parsing → benchmark engine → three DynamoDB writes (composite `scan_id` + sort key) → optional S3 raw-JSON archive → full JSON result returned to the caller.
4. **Frontend walkthrough** — Dashboard for the at-a-glance summary, Devices for per-host detail (click a row for the drawer), Firewall Rules with permit/deny filtering, CIS Results with PASS/FAIL evidence per check. "Run Scan" in the top bar validates the target client-side, posts to `/scan`, and refetches all three data hooks on completion.
5. **Design decisions, challenges, improvements** — the local-vs-Lambda scan-size split (above); choosing one firewall source format (Cisco IOS) over building two half-finished parsers; a static check registry over dynamic discovery for predictability; the async/SQS path as the natural next step once scan targets need to exceed API Gateway's timeout.

## Environment variables

All documented in `backend/.env.example` and `frontend/.env.example`. Nothing is hardcoded — IPs, keys, table names, and API URLs are all environment-driven on both sides.
