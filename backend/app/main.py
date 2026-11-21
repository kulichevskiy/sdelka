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

logging.basicConfig(level=logging.INFO)


def create_app() -> FastAPI:
    app = FastAPI(
        title="Сделка API",
        version="0.1.0",
        description=(
            "API CRM «Сделка». Запросы подписываются личным токеном из раздела "
            "«Настройки → API-токены»: заголовок `Authorization: Bearer sdl_…`. Токен действует "
            "от имени пользователя и видит только его организацию."
        ),
        openapi_url="/api/openapi.json",
        docs_url="/api/docs",
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
