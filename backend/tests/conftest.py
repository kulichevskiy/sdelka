"""Тесты ходят в настоящий Postgres: составные FK и JSONB SQLite не проверит.
Схема накатывается миграциями — так тесты заодно проверяют, что alembic в порядке."""

import os
import subprocess
import uuid
from collections.abc import AsyncIterator

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import text

TEST_DB = os.environ.get(
    "TEST_DATABASE_URL", "postgresql+asyncpg://crm:crm@localhost:5432/crm_test"
)
os.environ["DATABASE_URL"] = TEST_DB
os.environ["APP_URL"] = "http://testserver"
os.environ["SMTP_HOST"] = ""

from app.core.db import Base, get_engine  # noqa: E402
from app.main import app  # noqa: E402


@pytest.fixture(scope="session", autouse=True)
def migrated_schema():
    env = {**os.environ, "DATABASE_URL": TEST_DB}
    subprocess.run(["alembic", "downgrade", "base"], check=True, env=env, capture_output=True)
    subprocess.run(["alembic", "upgrade", "head"], check=True, env=env, capture_output=True)


@pytest.fixture(autouse=True)
async def clean_tables():
    yield
    tables = ", ".join(t.name for t in Base.metadata.sorted_tables)
    async with get_engine().begin() as conn:
        await conn.execute(text(f"TRUNCATE {tables} CASCADE"))


@pytest.fixture
async def client() -> AsyncIterator[AsyncClient]:
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as c:
        yield c


def unique_email(prefix: str = "user") -> str:
    return f"{prefix}-{uuid.uuid4().hex[:8]}@example.com"


async def register(client: AsyncClient, **overrides) -> dict:
    """Новая организация с owner'ом; куки остаются в клиенте."""
    body = {
        "name": "Анна",
        "email": unique_email(),
        "password": "secret123",
        "orgName": "Тест",
        "currency": "RUB",
        "pipelineTemplate": "standard",
        **overrides,
    }
    r = await client.post("/api/auth/register", json=body)
    assert r.status_code == 201, r.text
    return r.json()


async def new_client() -> AsyncClient:
    return AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver")


async def invite_and_accept(admin: AsyncClient, role: str = "member") -> AsyncClient:
    """Приглашает участника и возвращает залогиненного клиента за него."""
    r = await admin.post("/api/users/invite", json={"email": unique_email("m"), "role": role})
    assert r.status_code == 201, r.text
    token = r.json()["inviteUrl"].rsplit("/", 1)[1]
    member = await new_client()
    r = await member.post(
        "/api/auth/accept-invite", json={"token": token, "name": "Пётр", "password": "secret123"}
    )
    assert r.status_code == 200, r.text
    return member


async def make_company(client: AsyncClient, name: str = "ООО Ромашка") -> dict:
    r = await client.post("/api/companies", json={"name": name})
    assert r.status_code == 201, r.text
    return r.json()


async def make_deal(client: AsyncClient, company_id: str, title: str = "Сделка") -> dict:
    r = await client.post(
        "/api/deals", json={"title": title, "companyId": company_id, "amount": 100}
    )
    assert r.status_code == 201, r.text
    return r.json()
