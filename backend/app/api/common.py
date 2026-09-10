import uuid

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession


async def get_or_404[T](db: AsyncSession, model: type[T], id: uuid.UUID, org_id: uuid.UUID) -> T:
    """Чужой объект неотличим от несуществующего — так тенанты не узнают друг о друге."""
    row = (
        await db.execute(select(model).where(model.id == id, model.org_id == org_id))
    ).scalar_one_or_none()
    if row is None:
        raise HTTPException(404, "Не найдено")
    return row


async def ensure_exists(
    db: AsyncSession, model, id: uuid.UUID | None, org_id: uuid.UUID, what: str
):
    """Проверка ссылки из тела запроса: чужой id → 422, а не 500 от составного FK."""
    if id is None:
        return
    row = (
        await db.execute(select(model.id).where(model.id == id, model.org_id == org_id))
    ).scalar_one_or_none()
    if row is None:
        raise HTTPException(422, f"{what} не найден")


def apply_patch(row, patch) -> None:
    for key, value in patch.model_dump(exclude_unset=True).items():
        setattr(row, key, value)
