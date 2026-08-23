# 05 - REST API Reference & Data Schemas

## Overview
NetGuard exposes a high-performance REST API built on FastAPI. All data interchange is formatted in JSON. In local development mode, the API runs on `http://127.0.0.1:8000`. In production, it is served via AWS API Gateway HTTP API v2 over HTTPS.

## Authentication
All endpoints except `/health` require an API Key supplied in the HTTP request headers:
* **Header Name**: `x-api-key`
* **Header Value**: Must match the server's `NETGUARD_API_KEY` configuration.
* **Unauthorized Response (HTTP 401)**:
  ```json
  {
    "detail": "Invalid or missing API key"
  }
  ```

## 1. System Health Probe: `GET /health`
* **Authentication**: None (Public for health checking & uptime monitoring)
* **Response Status**: `200 OK`
* **Response Payload (JSON)**:
  ```json
  {
    "status": "ok",
    "dynamodb": "ok",
    "runtime_mode": "lambda",
    "aws_region": "us-east-1",
    "version": "1.0.0",
    "uptime_seconds": 45.2,
    "timestamp": "2026-08-23T10:10:25.674621+00:00",
    "services": {
      "database": "ok",
      "benchmark_engine": "ok",
      "host_discovery": "ok"
    }
  }
  ```

### Example Requests:
* **cURL**:
  ```bash
  curl http://127.0.0.1:8000/health
  ```
* **PowerShell**:
  ```powershell
  Invoke-RestMethod -Uri "http://127.0.0.1:8000/health" -Method Get
  ```

## 2. Trigger Security Sweep: `POST /scan`
* **Authentication**: Required (`x-api-key`)
* **Request Headers**:
  * `Content-Type: application/json`
  * `x-api-key: <api_key>`
* **Request Payload (JSON)**:
  ```json
  {
    "target": "1.1.1.1",
    "firewall_config_path": "hardened",
    "management_subnet": "10.10.0.0/24"
  }
  ```
* **Request Field Specifications**:
  * `target` (String, required): IPv4 address (e.g. `1.1.1.1`), comma-separated IP list, or CIDR block between `/24` and `/32` (e.g. `192.168.1.0/24`). Subnets wider than `/24` are rejected with HTTP 422.
  * `firewall_config_path` (String, optional, default: `"sample"`): Profile name (`sample`, `hardened`) or safe relative path.
  * `management_subnet` (String, optional, default: `"10.10.0.0/24"`): Trusted management subnet CIDR.

* **Response Status**: `200 OK`
* **Response Payload (JSON)**:
  ```json
  {
    "scan_id": "5b1ebec6-b060-4623-aa3e-bfcf4dfec49c",
    "target": "1.1.1.1",
    "devices": [
      {
        "device_id": "9f8e3f9b-1ee1-48e4-b067-9a48760ecfae",
        "scan_id": "5b1ebec6-b060-4623-aa3e-bfcf4dfec49c",
        "ip_address": "1.1.1.1",
        "hostname": "one.one.one.one",
        "mac_address": null,
        "vendor": null,
        "open_ports": [
          { "port": 53, "service": "dns", "banner": null },
          { "port": 80, "service": "http", "banner": "HTTP/1.1 403 Forbidden\r\nServer: cloudflare" },
          { "port": 443, "service": "http", "banner": "HTTP/1.1 400 Bad Request\r\nServer: cloudflare" },
          { "port": 8080, "service": "http", "banner": "HTTP/1.1 403 Forbidden" }
        ],
        "discovered_at": "2026-08-23T10:23:25.793655+00:00"
      }
    ],
    "cis_results": [
      {
        "check_id": "check_insecure_mgmt_protocols",
        "scan_id": "5b1ebec6-b060-4623-aa3e-bfcf4dfec49c",
        "status": "PASS",
        "evidence": "No unencrypted management protocols (Telnet, FTP, HTTP, SNMPv1/v2c) enabled or permitted.",
        "affected_items": [],
        "remediation": "Disable unencrypted management protocols and restrict transport to SSH.",
        "severity": "HIGH",
        "evaluated_at": "2026-08-23T10:23:26.110294+00:00"
      }
    ],
    "summary": {
      "total": 8,
      "passed": 8,
      "failed": 0
    },
    "persistence": {
      "engine": "dynamodb",
      "status": "synced",
      "details": "AWS DynamoDB (us-east-1)",
      "s3": "synced"
    }
  }
  ```

### Example Requests:
* **cURL**:
  ```bash
  curl -X POST http://127.0.0.1:8000/scan \
    -H "Content-Type: application/json" \
    -H "x-api-key: local-dev-key" \
    -d '{"target": "1.1.1.1", "firewall_config_path": "hardened"}'
  ```
* **Python**:
  ```python
  import requests
  res = requests.post(
      "http://127.0.0.1:8000/scan",
      json={"target": "1.1.1.1", "firewall_config_path": "hardened"},
      headers={"x-api-key": "local-dev-key"}
  )
  print(res.json())
  ```

## 3. Query Discovered Devices: `GET /devices`
* **Authentication**: Required (`x-api-key`)
* **Query Parameters**:
  * `scan_id` (String, optional): Specific scan UUID. Defaults to the latest scan if omitted.
  * `limit` (Integer, optional, default: 100, min: 1, max: 500): Pagination page size.
  * `next_token` (String, optional): Pagination token for fetching next page.
* **Response Status**: `200 OK`
* **Response Payload (JSON)**:
  ```json
  {
    "items": [
      {
        "device_id": "9f8e3f9b-1ee1-48e4-b067-9a48760ecfae",
        "scan_id": "5b1ebec6-b060-4623-aa3e-bfcf4dfec49c",
        "ip_address": "1.1.1.1",
        "hostname": "one.one.one.one",
        "mac_address": "00:1A:2B:3C:4D:5E",
        "vendor": "Cloudflare Inc.",
        "open_ports": [
          { "port": 53, "service": "dns", "banner": null },
          { "port": 443, "service": "https", "banner": "cloudflare" }
        ],
        "discovered_at": "2026-08-23T10:23:25.793655+00:00"
      }
    ],
    "next_token": null
  }
  ```

## 4. Query CIS Benchmark Results: `GET /cis-results`
* **Authentication**: Required (`x-api-key`)
* **Query Parameters**:
  * `status` (String, optional): Filter by `PASS` or `FAIL`.
  * `scan_id` (String, optional): Specific scan UUID. Defaults to latest scan if omitted.
  * `limit` (Integer, optional, default: 100, min: 1, max: 500).
  * `next_token` (String, optional).
* **Response Status**: `200 OK`
* **Response Payload (JSON)**:
  ```json
  {
    "items": [
      {
        "check_id": "check_ssh_only_mgmt",
        "scan_id": "5b1ebec6-b060-4623-aa3e-bfcf4dfec49c",
        "status": "PASS",
        "evidence": "SSH is the exclusive management transport and permitted only from the authorized management subnet.",
        "affected_items": [],
        "remediation": "Configure 'transport input ssh' and bind an access-class restricted to management subnets.",
        "severity": "HIGH",
        "evaluated_at": "2026-08-23T10:23:26.110294+00:00"
      }
    ],
    "summary": {
      "total": 8,
      "passed": 8,
      "failed": 0
    },
    "next_token": null
  }
  ```

## 5. Query Firewall Rules: `GET /firewall-rules`
* **Authentication**: Required (`x-api-key`)
* **Query Parameters**:
  * `action` (String, optional): Filter by `permit` or `deny`.
  * `scan_id` (String, optional): Specific scan UUID. Defaults to latest scan.
  * `limit` (Integer, optional, default: 100, min: 1, max: 500).
  * `next_token` (String, optional).
* **Response Status**: `200 OK`
* **Response Payload (JSON)**:
  ```json
  {
    "items": [
      {
        "rule_id": "4b91e69f-d7cd-436a-8c11-5006467618e0",
        "scan_id": "5b1ebec6-b060-4623-aa3e-bfcf4dfec49c",
        "action": "permit",
        "protocol": "tcp",
        "source": "10.10.0.0/24",
        "destination": "any",
        "destination_port": 22,
        "direction": "ingress",
        "raw_text": "permit tcp 10.10.0.0 0.0.0.255 any eq 22"
      }
    ],
    "next_token": null
  }
  ```

## Error Response Specifications

### 1. Scope Too Large for Synchronous Lambda (HTTP 422):
```json
{
  "detail": "target too large for synchronous Lambda scan, reduce host count or run locally"
}
```

### 2. Invalid API Key (HTTP 401):
```json
{
  "detail": "Invalid or missing API key"
}
```

### 3. Server-Side Error in Lambda Mode (HTTP 502 / 500):
```json
{
  "error": "scan_failed",
  "detail": "Security sweep failed. Check network connectivity or service logs."
}
```
*(In Local Dev Mode, `detail` contains the full Python exception string for rapid debugging).*
