from fastapi import APIRouter

from app.api import routes_cis, routes_devices, routes_firewall, routes_scan

api_router = APIRouter()
api_router.include_router(routes_scan.router, tags=["scan"])
api_router.include_router(routes_devices.router, tags=["devices"])
api_router.include_router(routes_firewall.router, tags=["firewall"])
api_router.include_router(routes_cis.router, tags=["cis"])
