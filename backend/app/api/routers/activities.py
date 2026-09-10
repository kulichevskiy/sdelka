import uuid
from datetime import date

from fastapi import APIRouter, HTTPException
from sqlalchemy import select

from app.api.common import ensure_exists, get_or_404
from app.core.deps import DB, Cur
from app.models import Activity, Company, Contact, Deal
from app.schemas import ActivityIn, ActivityOut

router = APIRouter(prefix="/activities")


@router.get("", response_model=list[ActivityOut])
async def list_activities(current: Cur, db: DB) -> list[ActivityOut]:
    rows = (
        (
            await db.execute(
                select(Activity)
                .where(Activity.org_id == current.org_id)
                .order_by(Activity.date.desc(), Activity.created_at.desc())
            )
        )
        .scalars()
        .all()
    )
    return [ActivityOut.model_validate(r) for r in rows]


@router.post("", response_model=ActivityOut, status_code=201)
async def create_activity(body: ActivityIn, current: Cur, db: DB) -> ActivityOut:
    await ensure_exists(db, Company, body.company_id, current.org_id, "Компания")
    await ensure_exists(db, Contact, body.contact_id, current.org_id, "Контакт")
    await ensure_exists(db, Deal, body.deal_id, current.org_id, "Сделка")
    row = Activity(
        org_id=current.org_id,
        **body.model_dump(exclude={"date"}),
        date=body.date or date.today(),
        author_id=current.user.id,
    )
    db.add(row)
    await db.commit()
    return ActivityOut.model_validate(row)


@router.delete("/{activity_id}", status_code=204)
async def delete_activity(activity_id: uuid.UUID, current: Cur, db: DB) -> None:
    row = await get_or_404(db, Activity, activity_id, current.org_id)
    if row.author_id != current.user.id and not current.is_admin:
        raise HTTPException(403, "Удалить чужую запись может только администратор")
    await db.delete(row)
    await db.commit()
