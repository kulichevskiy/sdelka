"""RLS: база сама не отдаёт и не принимает чужие строки, даже если запрос в коде
забыл фильтр по org_id."""

import uuid

import pytest
from sqlalchemy import func, select, text, update
from sqlalchemy.exc import DBAPIError

from app.core.db import APP_ROLE, Base, get_engine, system_session, tenant_session
from app.models import ApiToken, Company, Deal, Organization, Session, User
from tests.conftest import make_company, make_deal, new_client, register


async def _two_orgs(client) -> tuple[uuid.UUID, uuid.UUID]:
    me_a = await register(client)
    company = await make_company(client)
    await make_deal(client, company["id"])
    await client.post("/api/auth/api-tokens", json={"name": "a"})

    other = await new_client()
    me_b = await register(other)
    company = await make_company(other, "ООО Чужая")
    await make_deal(other, company["id"])
    await other.post("/api/auth/api-tokens", json={"name": "b"})
    return uuid.UUID(me_a["org"]["id"]), uuid.UUID(me_b["org"]["id"])


async def test_every_table_has_policy():
    """Новая таблица без RLS — дыра в изоляции: миграция обязана включить политику."""
    async with get_engine().connect() as conn:
        rows = (
            await conn.execute(
                text(
                    "SELECT c.relname, c.relrowsecurity, "
                    "(SELECT count(*) FROM pg_policy p WHERE p.polrelid = c.oid) "
                    "FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace "
                    "WHERE n.nspname = 'public' AND c.relkind = 'r'"
                )
            )
        ).all()
    state = {name: (enabled, policies) for name, enabled, policies in rows}
    for table in Base.metadata.sorted_tables:
        enabled, policies = state[table.name]
        assert enabled and policies > 0, f"у таблицы {table.name} нет RLS"


async def test_unfiltered_queries_see_only_own_org(client):
    org_a, org_b = await _two_orgs(client)

    async with tenant_session(org_a) as db:
        assert (await db.execute(text("SELECT current_user"))).scalar_one() == APP_ROLE
        # Ни в одном запросе нет фильтра по org_id — границу держит база.
        assert {d.org_id for d in (await db.execute(select(Deal))).scalars()} == {org_a}
        assert {c.org_id for c in (await db.execute(select(Company))).scalars()} == {org_a}
        assert {u.org_id for u in (await db.execute(select(User))).scalars()} == {org_a}
        assert [o.id for o in (await db.execute(select(Organization))).scalars()] == [org_a]
        own_users = {u.id for u in (await db.execute(select(User))).scalars()}
        # Сессии и токены видны только у пользователей своей организации.
        for model in (Session, ApiToken):
            rows = (await db.execute(select(model))).scalars().all()
            assert len(rows) == 1 and rows[0].user_id in own_users

    async with system_session() as db:
        count = (await db.execute(select(func.count()).select_from(Deal))).scalar_one()
        assert count == 2


async def test_session_without_org_sees_nothing(client):
    await _two_orgs(client)
    async with tenant_session() as db:
        for model in (Organization, User, Deal, Company, Session, ApiToken):
            assert (await db.execute(select(model))).scalars().all() == []


async def test_writes_to_foreign_org_are_blocked(client):
    org_a, org_b = await _two_orgs(client)

    async with tenant_session(org_a) as db:
        result = await db.execute(update(Deal).where(Deal.org_id == org_b).values(title="взлом"))
        assert result.rowcount == 0
        result = await db.execute(text("DELETE FROM deals WHERE org_id = :org"), {"org": org_b})
        assert result.rowcount == 0
        await db.rollback()

    async with tenant_session(org_a) as db:
        owner_b = uuid.uuid4()
        db.add(Company(org_id=org_b, name="подброшенная", owner_id=owner_b))
        with pytest.raises(DBAPIError, match="row-level security"):
            await db.flush()

    async with tenant_session(org_a) as db:
        # Перенести свою строку в чужую организацию тоже нельзя.
        with pytest.raises(DBAPIError, match="row-level security"):
            await db.execute(update(Deal).values(org_id=org_b))

    async with system_session() as db:
        titles = (await db.execute(select(Deal.title).where(Deal.org_id == org_b))).scalars().all()
        assert titles == ["Сделка"]


async def test_scope_is_reapplied_after_commit(client):
    """Область действует на транзакцию: после commit она должна выставляться заново."""
    org_a, _ = await _two_orgs(client)
    async with tenant_session(org_a) as db:
        assert len((await db.execute(select(Deal))).scalars().all()) == 1
        await db.commit()
        assert len((await db.execute(select(Deal))).scalars().all()) == 1
        assert (await db.execute(text("SELECT current_user"))).scalar_one() == APP_ROLE

    # Соединение вернулось в пул без следов чужой области.
    async with tenant_session() as db:
        assert (await db.execute(select(Deal))).scalars().all() == []
