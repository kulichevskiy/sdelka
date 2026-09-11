import csv
import io
import uuid
from datetime import date

from fastapi import APIRouter, HTTPException, Response
from sqlalchemy import and_, select, update

from app.api.common import apply_patch, ensure_exists, get_or_404
from app.core.deps import DB, Admin, Cur
from app.models import Activity, Company, Contact, CustomField, Deal, Stage, User
from app.schemas import DealIn, DealMoveIn, DealOut, DealPatch

router = APIRouter(prefix="/deals")


@router.get("", response_model=list[DealOut])
async def list_deals(current: Cur, db: DB) -> list[DealOut]:
    rows = (
        (
            await db.execute(
                select(Deal).where(Deal.org_id == current.org_id).order_by(Deal.created_at.desc())
            )
        )
        .scalars()
        .all()
    )
    return [DealOut.model_validate(r) for r in rows]


def _csv_cell(value):
    # Quoting alone does not stop spreadsheet formulas. Preserve the original text after a quote.
    if isinstance(value, str):
        significant = value.lstrip("\ufeff \t\r\n\v\f")
        if value.startswith(("\t", "\r", "\n")) or significant.startswith(("=", "+", "-", "@")):
            return "'" + value
    return value


@router.get(
    "/export.csv",
    response_class=Response,
    responses={200: {"content": {"text/csv": {"schema": {"type": "string", "format": "binary"}}}}},
)
async def export_deals(current: Cur, db: DB) -> Response:
    fields = (
        await db.scalars(
            select(CustomField)
            .where(CustomField.org_id == current.org_id, CustomField.entity == "deal")
            .order_by(CustomField.order, CustomField.id)
        )
    ).all()
    query = select(Deal, Company.name, Contact.name, User.name, Stage.name)
    for model, ref in (
        (Company, Deal.company_id),
        (Contact, Deal.contact_id),
        (User, Deal.owner_id),
        (Stage, Deal.stage_id),
    ):
        query = query.outerjoin(model, and_(model.id == ref, model.org_id == current.org_id))
    rows = (
        await db.execute(
            query.where(Deal.org_id == current.org_id).order_by(Deal.created_at.desc(), Deal.id)
        )
    ).all()
    # Buffer before sending headers: a query/serialization failure must not look like a full export.
    output = io.StringIO(newline="")
    writer = csv.writer(output)
    writer.writerow(
        [
            "ID",
            "Название",
            "Компания",
            "Контакт",
            "Ответственный",
            "Стадия",
            "Сумма",
            "Валюта",
            "Дата создания",
            "Ожидаемая дата закрытия",
            "Исход",
            "Причина проигрыша",
            "Описание",
            *(_csv_cell(field.name) for field in fields),
        ]
    )
    for deal, company, contact, owner, stage in rows:
        writer.writerow(
            _csv_cell(value)
            for value in [
                deal.id,
                deal.title,
                company,
                contact,
                owner,
                stage,
                deal.amount,
                current.org.currency,
                deal.created_on,
                deal.expected_close_date,
                deal.outcome,
                deal.lost_reason,
                deal.description,
                *(deal.custom_values.get(str(field.id)) for field in fields),
            ]
        )
    return Response(
        output.getvalue().encode("utf-8-sig"),
        media_type="text/csv",
        headers={
            "Content-Disposition": 'attachment; filename="deals.csv"',
            "Cache-Control": "no-store",
        },
    )


async def _check_refs(db, current, company_id, contact_id, owner_id) -> None:
    await ensure_exists(db, Company, company_id, current.org_id, "Компания")
    await ensure_exists(db, Contact, contact_id, current.org_id, "Контакт")
    await ensure_exists(db, User, owner_id, current.org_id, "Ответственный")


@router.post("", response_model=DealOut, status_code=201)
async def create_deal(body: DealIn, current: Cur, db: DB) -> DealOut:
    await _check_refs(db, current, body.company_id, body.contact_id, body.owner_id)
    stages = (
        (
            await db.execute(
                select(Stage).where(Stage.org_id == current.org_id).order_by(Stage.order)
            )
        )
        .scalars()
        .all()
    )
    if not stages:
        raise HTTPException(409, "В воронке нет стадий")
    first = next((s for s in stages if not s.is_closing), stages[-1])
    row = Deal(
        org_id=current.org_id,
        **body.model_dump(exclude={"owner_id"}),
        owner_id=body.owner_id or current.user.id,
        stage_id=first.id,
        created_on=date.today(),
    )
    db.add(row)
    await db.commit()
    return DealOut.model_validate(row)


@router.patch("/{deal_id}", response_model=DealOut)
async def patch_deal(deal_id: uuid.UUID, body: DealPatch, current: Cur, db: DB) -> DealOut:
    row = await get_or_404(db, Deal, deal_id, current.org_id)
    await _check_refs(db, current, body.company_id, body.contact_id, body.owner_id)
    apply_patch(row, body)
    await db.commit()
    return DealOut.model_validate(row)


@router.post("/{deal_id}/move", response_model=DealOut)
async def move_deal(deal_id: uuid.UUID, body: DealMoveIn, current: Cur, db: DB) -> DealOut:
    row = await get_or_404(db, Deal, deal_id, current.org_id)
    stage = await get_or_404(db, Stage, body.stage_id, current.org_id)
    if stage.is_closing:
        if body.outcome is None:
            raise HTTPException(422, "Для закрытия сделки укажите исход")
        if body.outcome == "lost" and not (body.lost_reason or "").strip():
            raise HTTPException(422, "Для проигранной сделки укажите причину")
        row.outcome = body.outcome
        row.lost_reason = body.lost_reason if body.outcome == "lost" else None
    else:
        row.outcome = None
        row.lost_reason = None
    row.stage_id = stage.id
    await db.commit()
    return DealOut.model_validate(row)


@router.delete("/{deal_id}", status_code=204)
async def delete_deal(deal_id: uuid.UUID, current: Admin, db: DB) -> None:
    row = await get_or_404(db, Deal, deal_id, current.org_id)
    await db.execute(update(Activity).where(Activity.deal_id == row.id).values(deal_id=None))
    await db.delete(row)  # задачи уходят каскадом по FK
    await db.commit()
