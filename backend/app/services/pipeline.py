"""Стартовые воронки при регистрации."""

import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Stage

STANDARD = ["Новая заявка", "Квалификация", "Предложение", "Переговоры"]
CLOSING = "Закрыто"


def make_stages(org_id: uuid.UUID, template: str) -> list[Stage]:
    names = STANDARD if template == "standard" else []
    stages = [Stage(org_id=org_id, name=n, order=i + 1) for i, n in enumerate(names)]
    stages.append(Stage(org_id=org_id, name=CLOSING, order=len(names) + 1, is_closing=True))
    return stages


async def add_stages(db: AsyncSession, org_id: uuid.UUID, template: str) -> None:
    db.add_all(make_stages(org_id, template))
