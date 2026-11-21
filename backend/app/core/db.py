"""Движок и сессии БД.

Изоляция тенантов держится на RLS. Приложение подключается владельцем схемы, но каждая
транзакция обычной сессии переключается на роль APP_ROLE (без BYPASSRLS) и получает
`app.org_id` — политики пропускают только строки этой организации. Пока организация не
задана, сессия не видит ничего. Системная сессия роль не меняет и RLS обходит: она нужна
там, где организации ещё нет — вход, регистрация, одноразовые ссылки, поиск токена.
"""

import uuid
from collections.abc import AsyncIterator

from sqlalchemy import event, text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase, Session

from app.core.config import get_settings

# Роль создаётся миграцией 0002; имя зашито и там, и здесь.
APP_ROLE = "sdelka_app"


class Base(DeclarativeBase):
    pass


class ScopedSession(Session):
    """Синхронная основа AsyncSession: на ней висит обработчик начала транзакции."""


@event.listens_for(ScopedSession, "after_begin")
def _scope_transaction(session: Session, transaction, connection) -> None:
    if session.info.get("system"):
        return
    org_id = session.info.get("org_id")
    # set_config(..., true) = SET LOCAL: действует до конца транзакции, поэтому соединение
    # возвращается в пул чистым, а после commit область выставляется заново.
    connection.execute(
        text("SELECT set_config('role', :role, true), set_config('app.org_id', :org_id, true)"),
        {"role": APP_ROLE, "org_id": str(org_id) if org_id else ""},
    )


# Движок создаётся лениво: тесты подменяют DATABASE_URL до первого обращения.
_engine = None
_sessionmaker: async_sessionmaker[AsyncSession] | None = None


def get_engine():
    global _engine, _sessionmaker
    if _engine is None:
        _engine = create_async_engine(get_settings().database_url, pool_pre_ping=True)
        _sessionmaker = async_sessionmaker(
            _engine, expire_on_commit=False, sync_session_class=ScopedSession
        )
    return _engine


def get_sessionmaker() -> async_sessionmaker[AsyncSession]:
    get_engine()
    assert _sessionmaker is not None
    return _sessionmaker


def tenant_session(org_id: uuid.UUID | None = None) -> AsyncSession:
    """Сессия под RLS. Без org_id не видит ни одной строки."""
    session = get_sessionmaker()()
    session.info["org_id"] = org_id
    return session


def system_session() -> AsyncSession:
    """Сессия в обход RLS. Только для кода, который сам отвечает за границы тенантов."""
    session = get_sessionmaker()()
    session.info["system"] = True
    return session


def set_org(session: AsyncSession, org_id: uuid.UUID) -> None:
    """Привязывает сессию к организации. Вызывать до первого запроса в сессии."""
    assert not session.in_transaction(), "область RLS задаётся до начала транзакции"
    session.info["org_id"] = org_id


async def get_db() -> AsyncIterator[AsyncSession]:
    async with tenant_session() as session:
        yield session


async def get_system_db() -> AsyncIterator[AsyncSession]:
    async with system_session() as session:
        yield session
