"""Зависимости FastAPI: сессия БД, текущий пользователь, проверки ролей."""

import uuid
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import Annotated, Literal

from fastapi import Cookie, Depends, HTTPException, Response
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings, get_settings
from app.core.db import get_db, get_system_db, set_org, system_session
from app.core.security import hash_token, new_token
from app.models import ApiToken, Organization, Session, User

SESSION_COOKIE = "session"
# Отметку «последнее использование» токена обновляем не чаще, чем раз в этот интервал.
TOKEN_TOUCH_INTERVAL = timedelta(minutes=5)

# Обычная сессия: под RLS, видит только организацию текущего пользователя.
DB = Annotated[AsyncSession, Depends(get_db)]
# Системная сессия в обход RLS: для эндпоинтов, где пользователя ещё нет.
SystemDB = Annotated[AsyncSession, Depends(get_system_db)]
Cfg = Annotated[Settings, Depends(get_settings)]

_bearer = HTTPBearer(
    auto_error=False,
    scheme_name="API-токен",
    description="Личный токен из раздела «Настройки → API-токены».",
)
Bearer = Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)]


@dataclass
class Current:
    user: User
    org: Organization
    # Чем подтверждён запрос: cookie-сессией из браузера или личным API-токеном.
    via: Literal["session", "token"] = "session"

    @property
    def org_id(self) -> uuid.UUID:
        return self.org.id

    @property
    def is_admin(self) -> bool:
        return self.user.role in ("owner", "admin")


async def _user_id_by_api_token(sysdb: AsyncSession, token: str, now: datetime) -> uuid.UUID:
    row = (
        await sysdb.execute(select(ApiToken).where(ApiToken.token_hash == hash_token(token)))
    ).scalar_one_or_none()
    if row is None:
        raise HTTPException(401, "API-токен недействителен или отозван")
    if row.last_used_at is None or now - row.last_used_at > TOKEN_TOUCH_INTERVAL:
        row.last_used_at = now
        await sysdb.commit()
    return row.user_id


async def _user_id_by_session(
    sysdb: AsyncSession, token: str, now: datetime, settings: Settings
) -> uuid.UUID:
    row = (
        await sysdb.execute(select(Session).where(Session.token_hash == hash_token(token)))
    ).scalar_one_or_none()
    if row is None or row.expires_at < now:
        raise HTTPException(401, "Сессия истекла, войдите заново")
    # Продлеваем скользящее окно не чаще раза в день, чтобы не писать в БД на каждый запрос.
    ttl = timedelta(days=settings.session_ttl_days)
    if row.expires_at - now < ttl - timedelta(days=1):
        row.expires_at = now + ttl
        await sysdb.commit()
    return row.user_id


async def get_current(
    db: DB,
    settings: Cfg,
    bearer: Bearer = None,
    session: Annotated[str | None, Cookie()] = None,
) -> Current:
    if bearer is None and not session:
        raise HTTPException(401, "Нужно войти")
    now = datetime.now(UTC)
    # Кто пришёл, выясняем в обход RLS: организация ещё неизвестна. Заголовок Authorization
    # главнее cookie — явный токен не должен молча подменяться сессией браузера.
    async with system_session() as sysdb:
        if bearer is not None:
            user_id = await _user_id_by_api_token(sysdb, bearer.credentials, now)
        else:
            assert session is not None
            user_id = await _user_id_by_session(sysdb, session, now, settings)
        org_id = (
            await sysdb.execute(
                select(User.org_id).where(User.id == user_id, User.status == "active")
            )
        ).scalar_one_or_none()
    if org_id is None:
        raise HTTPException(401, "Доступ отключён")
    # Дальше запрос живёт под RLS своей организации.
    set_org(db, org_id)
    user = await db.get(User, user_id)
    org = await db.get(Organization, org_id)
    assert user is not None and org is not None
    return Current(user=user, org=org, via="token" if bearer is not None else "session")


Cur = Annotated[Current, Depends(get_current)]


async def require_browser_session(current: Cur) -> Current:
    """Управление доступом (пароль, токены) — только из браузера: украденный токен
    не должен уметь выпустить себе замену."""
    if current.via != "session":
        raise HTTPException(403, "Это действие доступно только после входа в приложение")
    return current


BrowserCur = Annotated[Current, Depends(require_browser_session)]


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


async def require_browser_admin(current: BrowserCur) -> Current:
    return await require_admin(current)


async def require_browser_owner(current: BrowserCur) -> Current:
    return await require_owner(current)


# Управление людьми и их доступом: ссылки приглашения и сброса дают вход в приложение,
# поэтому украденный токен админа не должен уметь их выпускать.
BrowserAdmin = Annotated[Current, Depends(require_browser_admin)]
BrowserOwner = Annotated[Current, Depends(require_browser_owner)]


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
