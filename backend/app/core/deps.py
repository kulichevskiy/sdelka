"""Зависимости FastAPI: сессия БД, текущий пользователь, проверки ролей."""

import uuid
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import Annotated

from fastapi import Cookie, Depends, HTTPException, Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings, get_settings
from app.core.db import get_db
from app.core.security import hash_token, new_token
from app.models import Organization, Session, User

SESSION_COOKIE = "session"

DB = Annotated[AsyncSession, Depends(get_db)]
Cfg = Annotated[Settings, Depends(get_settings)]


@dataclass
class Current:
    user: User
    org: Organization

    @property
    def org_id(self) -> uuid.UUID:
        return self.org.id

    @property
    def is_admin(self) -> bool:
        return self.user.role in ("owner", "admin")


async def get_current(
    db: DB,
    settings: Cfg,
    session: Annotated[str | None, Cookie()] = None,
) -> Current:
    if not session:
        raise HTTPException(401, "Нужно войти")
    now = datetime.now(UTC)
    row = (
        await db.execute(select(Session).where(Session.token_hash == hash_token(session)))
    ).scalar_one_or_none()
    if row is None or row.expires_at < now:
        raise HTTPException(401, "Сессия истекла, войдите заново")
    user = await db.get(User, row.user_id)
    if user is None or user.status != "active":
        raise HTTPException(401, "Доступ отключён")
    # Продлеваем скользящее окно не чаще раза в день, чтобы не писать в БД на каждый запрос.
    ttl = timedelta(days=settings.session_ttl_days)
    if row.expires_at - now < ttl - timedelta(days=1):
        row.expires_at = now + ttl
        await db.commit()
    org = await db.get(Organization, user.org_id)
    assert org is not None
    return Current(user=user, org=org)


Cur = Annotated[Current, Depends(get_current)]


async def require_admin(current: Cur) -> Current:
    if not current.is_admin:
        raise HTTPException(403, "Нужны права администратора")
    return current


async def require_owner(current: Cur) -> Current:
    if current.user.role != "owner":
        raise HTTPException(403, "Это может сделать только владелец организации")
    return current


Admin = Annotated[Current, Depends(require_admin)]
Owner = Annotated[Current, Depends(require_owner)]


async def start_session(
    db: AsyncSession, user: User, response: Response, settings: Settings
) -> None:
    token = new_token()
    db.add(
        Session(
            user_id=user.id,
            token_hash=hash_token(token),
            expires_at=datetime.now(UTC) + timedelta(days=settings.session_ttl_days),
        )
    )
    await db.commit()
    response.set_cookie(
        SESSION_COOKIE,
        token,
        max_age=settings.session_ttl_days * 86400,
        httponly=True,
        samesite="lax",
        secure=settings.cookie_secure,
        path="/",
    )


def clear_session_cookie(response: Response, settings: Settings) -> None:
    response.delete_cookie(
        SESSION_COOKIE, path="/", httponly=True, samesite="lax", secure=settings.cookie_secure
    )
