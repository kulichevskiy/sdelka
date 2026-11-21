"""Одноразовые ссылки: приглашения, сброс пароля, подтверждение почты."""

import uuid
from datetime import UTC, datetime, timedelta

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.security import hash_token, new_token
from app.models import Token


async def issue(
    db: AsyncSession, user_id: uuid.UUID, kind: str, created_by: uuid.UUID | None
) -> str:
    """Выдаёт новый токен и гасит прежние того же вида: живой должен быть ровно один."""
    settings = get_settings()
    ttl = {
        "invite": timedelta(days=settings.invite_ttl_days),
        "reset": timedelta(hours=settings.reset_ttl_hours),
        "verify": timedelta(hours=settings.verify_ttl_hours),
    }[kind]
    now = datetime.now(UTC)
    await db.execute(
        update(Token)
        .where(Token.user_id == user_id, Token.kind == kind, Token.used_at.is_(None))
        .values(used_at=now)
    )
    token = new_token()
    db.add(
        Token(
            user_id=user_id,
            kind=kind,
            token_hash=hash_token(token),
            expires_at=now + ttl,
            created_by=created_by,
        )
    )
    await db.flush()
    return token


def url_for(kind: str, token: str) -> str:
    base = get_settings().app_url.rstrip("/")
    return f"{base}/{kind}/{token}"


async def find_valid(db: AsyncSession, kind: str, token: str) -> Token | None:
    row = (
        await db.execute(
            select(Token).where(Token.token_hash == hash_token(token), Token.kind == kind)
        )
    ).scalar_one_or_none()
    if row is None or row.used_at is not None or row.expires_at < datetime.now(UTC):
        return None
    return row
