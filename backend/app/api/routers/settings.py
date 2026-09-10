"""Справочники организации: дополнительные поля и причины проигрыша."""

import uuid

from fastapi import APIRouter
from sqlalchemy import func, select, update

from app.api.common import apply_patch, get_or_404
from app.core.deps import DB, Admin, Cur
from app.models import CustomField, Deal, LossReason
from app.schemas import (
    CustomFieldIn,
    CustomFieldOut,
    CustomFieldPatch,
    LossReasonIn,
    LossReasonOut,
)

router = APIRouter()


@router.get("/custom-fields", response_model=list[CustomFieldOut])
async def list_fields(current: Cur, db: DB) -> list[CustomFieldOut]:
    rows = (
        (
            await db.execute(
                select(CustomField)
                .where(CustomField.org_id == current.org_id)
                .order_by(CustomField.order, CustomField.name)
            )
        )
        .scalars()
        .all()
    )
    return [CustomFieldOut.model_validate(r) for r in rows]


@router.post("/custom-fields", response_model=CustomFieldOut, status_code=201)
async def add_field(body: CustomFieldIn, current: Admin, db: DB) -> CustomFieldOut:
    max_order = (
        await db.execute(
            select(func.coalesce(func.max(CustomField.order), 0)).where(
                CustomField.org_id == current.org_id
            )
        )
    ).scalar_one()
    row = CustomField(
        org_id=current.org_id,
        **body.model_dump(),
        order=max_order + 1,
    )
    if row.type != "select":
        row.options = []
    db.add(row)
    await db.commit()
    return CustomFieldOut.model_validate(row)


@router.patch("/custom-fields/{field_id}", response_model=CustomFieldOut)
async def patch_field(
    field_id: uuid.UUID, body: CustomFieldPatch, current: Admin, db: DB
) -> CustomFieldOut:
    row = await get_or_404(db, CustomField, field_id, current.org_id)
    apply_patch(row, body)
    await db.commit()
    return CustomFieldOut.model_validate(row)


@router.delete("/custom-fields/{field_id}", status_code=204)
async def delete_field(field_id: uuid.UUID, current: Admin, db: DB) -> None:
    row = await get_or_404(db, CustomField, field_id, current.org_id)
    await db.delete(row)
    await db.commit()


async def _usage(db, org_id) -> dict[str, int]:
    rows = (
        await db.execute(
            select(Deal.lost_reason, func.count())
            .where(Deal.org_id == org_id, Deal.lost_reason.is_not(None))
            .group_by(Deal.lost_reason)
        )
    ).all()
    return {name: count for name, count in rows}


@router.get("/loss-reasons", response_model=list[LossReasonOut])
async def list_reasons(current: Cur, db: DB) -> list[LossReasonOut]:
    rows = (
        (
            await db.execute(
                select(LossReason)
                .where(LossReason.org_id == current.org_id)
                .order_by(LossReason.name)
            )
        )
        .scalars()
        .all()
    )
    usage = await _usage(db, current.org_id)
    return [LossReasonOut(id=r.id, name=r.name, usage_count=usage.get(r.name, 0)) for r in rows]


@router.post("/loss-reasons", response_model=LossReasonOut, status_code=201)
async def add_reason(body: LossReasonIn, current: Admin, db: DB) -> LossReasonOut:
    row = LossReason(org_id=current.org_id, name=body.name)
    db.add(row)
    await db.commit()
    return LossReasonOut(id=row.id, name=row.name, usage_count=0)


@router.patch("/loss-reasons/{reason_id}", response_model=LossReasonOut)
async def rename_reason(
    reason_id: uuid.UUID, body: LossReasonIn, current: Admin, db: DB
) -> LossReasonOut:
    row = await get_or_404(db, LossReason, reason_id, current.org_id)
    # Сделки хранят причину текстом — переименование должно догнать и их.
    await db.execute(
        update(Deal)
        .where(Deal.org_id == current.org_id, Deal.lost_reason == row.name)
        .values(lost_reason=body.name)
    )
    row.name = body.name
    await db.commit()
    usage = await _usage(db, current.org_id)
    return LossReasonOut(id=row.id, name=row.name, usage_count=usage.get(row.name, 0))


@router.delete("/loss-reasons/{reason_id}", status_code=204)
async def delete_reason(reason_id: uuid.UUID, current: Admin, db: DB) -> None:
    row = await get_or_404(db, LossReason, reason_id, current.org_id)
    await db.delete(row)
    await db.commit()
