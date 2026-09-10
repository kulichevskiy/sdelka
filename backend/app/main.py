import logging

from fastapi import APIRouter, FastAPI

from app.api.routers import (
    activities,
    auth,
    companies,
    contacts,
    deals,
    health,
    org,
    settings,
    stages,
    tasks,
    users,
)
from app.core.config import get_settings

logging.basicConfig(level=logging.INFO)


def create_app() -> FastAPI:
    cfg = get_settings()
    app = FastAPI(
        title="Sales HQ API",
        version="0.1.0",
        openapi_url="/api/openapi.json",
        docs_url="/api/docs" if cfg.debug else None,
        redoc_url=None,
    )
    api = APIRouter(prefix="/api")
    for r in (
        health,
        auth,
        org,
        users,
        stages,
        companies,
        contacts,
        deals,
        tasks,
        activities,
        settings,
    ):
        api.include_router(r.router)
    app.include_router(api)
    return app


app = create_app()
