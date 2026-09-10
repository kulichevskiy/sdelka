import uuid

from fastapi import APIRouter
from sqlalchemy import select, update

from app.api.common import apply_patch, ensure_exists, get_or_404
from app.core.deps import DB, Admin, Cur
from app.models import Activity, Company, Contact, Deal, User
from app.schemas import ContactIn, ContactOut, ContactPatch

router = APIRouter(prefix="/contacts")


@router.get("", response_model=list[ContactOut])
async def list_contacts(current: Cur, db: DB) -> list[ContactOut]:
    rows = (
        (
            await db.execute(
                select(Contact)
                .where(Contact.org_id == current.org_id)
                .order_by(Contact.created_at.desc())
            )
        )
        .scalars()
        .all()
    )
    return [ContactOut.model_validate(r) for r in rows]


@router.post("", response_model=ContactOut, status_code=201)
async def create_contact(body: ContactIn, current: Cur, db: DB) -> ContactOut:
    await ensure_exists(db, Company, body.company_id, current.org_id, "Компания")
    await ensure_exists(db, User, body.owner_id, current.org_id, "Ответственный")
    row = Contact(
        org_id=current.org_id,
        **body.model_dump(exclude={"owner_id"}),
        owner_id=body.owner_id or current.user.id,
    )
    db.add(row)
    await db.commit()
    return ContactOut.model_validate(row)


@router.patch("/{contact_id}", response_model=ContactOut)
async def patch_contact(
    contact_id: uuid.UUID, body: ContactPatch, current: Cur, db: DB
) -> ContactOut:
    row = await get_or_404(db, Contact, contact_id, current.org_id)
    await ensure_exists(db, Company, body.company_id, current.org_id, "Компания")
    await ensure_exists(db, User, body.owner_id, current.org_id, "Ответственный")
    apply_patch(row, body)
    await db.commit()
    return ContactOut.model_validate(row)


@router.delete("/{contact_id}", status_code=204)
async def delete_contact(contact_id: uuid.UUID, current: Admin, db: DB) -> None:
    row = await get_or_404(db, Contact, contact_id, current.org_id)
    # Составной FK не умеет SET NULL по одной колонке, поэтому снимаем ссылки руками.
    await db.execute(update(Deal).where(Deal.contact_id == row.id).values(contact_id=None))
    await db.execute(update(Activity).where(Activity.contact_id == row.id).values(contact_id=None))
    await db.delete(row)
    await db.commit()
