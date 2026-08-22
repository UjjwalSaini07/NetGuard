import os
from functools import lru_cache
from dotenv import load_dotenv
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

load_dotenv()


class Settings(BaseSettings):
    model_config = SettingsConfigDict(populate_by_name=True, extra="ignore")

    netguard_api_key: str = Field(alias="NETGUARD_API_KEY")
    aws_region: str = Field(default="us-east-1", alias="AWS_REGION")
    dynamodb_table_devices: str = Field(alias="DYNAMODB_TABLE_DEVICES")
    dynamodb_table_firewall_rules: str = Field(alias="DYNAMODB_TABLE_FIREWALL_RULES")
    dynamodb_table_cis_results: str = Field(alias="DYNAMODB_TABLE_CIS_RESULTS")
    dynamodb_table_scans: str = Field(default="NetGuardScans", alias="DYNAMODB_TABLE_SCANS")

    scan_port_list: str = Field(
        default="21,22,23,25,53,80,110,143,443,445,3306,3389,5432,8080",
        alias="SCAN_PORT_LIST",
    )
    scan_timeout_seconds: float = Field(default=0.75, alias="SCAN_TIMEOUT_SECONDS")
    scan_max_threads: int = Field(default=64, alias="SCAN_MAX_THREADS")
    runtime_mode: str = Field(default="local", alias="RUNTIME_MODE")
    scan_max_hosts: int = Field(default=254, alias="SCAN_MAX_HOSTS")
    scan_max_hosts_lambda: int = Field(default=16, alias="SCAN_MAX_HOSTS_LAMBDA")
    log_level: str = Field(default="INFO", alias="LOG_LEVEL")
    s3_bucket_raw_results: str = Field(default="", alias="S3_BUCKET_RAW_RESULTS")
    management_subnet: str = Field(default="10.10.0.0/24", alias="MANAGEMENT_SUBNET")


    @property
    def port_list(self) -> list[int]:
        return [int(p.strip()) for p in self.scan_port_list.split(",") if p.strip()]


class ConfigError(RuntimeError):
    pass


@lru_cache
def get_settings() -> Settings:
    try:
        settings = Settings()
    except Exception as exc:
        raise ConfigError(f"invalid or missing NetGuard configuration: {exc}") from exc

    if not settings.netguard_api_key:
        raise ConfigError("NETGUARD_API_KEY is required")
    if not settings.dynamodb_table_devices:
        raise ConfigError("DYNAMODB_TABLE_DEVICES is required")
    if not settings.dynamodb_table_firewall_rules:
        raise ConfigError("DYNAMODB_TABLE_FIREWALL_RULES is required")
    if not settings.dynamodb_table_cis_results:
        raise ConfigError("DYNAMODB_TABLE_CIS_RESULTS is required")
    return settings
