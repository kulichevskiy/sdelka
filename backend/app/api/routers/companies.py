import uuid

from fastapi import APIRouter, HTTPException
from sqlalchemy import exists, or_, select

from app.api.common import apply_patch, ensure_exists, get_or_404
from app.core.deps import DB, Admin, Cur
from app.models import Company, Contact, Deal, User
from app.schemas import CompanyIn, CompanyOut, CompanyPatch

router = APIRouter(prefix="/companies")


@router.get("", response_model=list[CompanyOut])
async def list_companies(current: Cur, db: DB) -> list[CompanyOut]:
    rows = (
        (
            await db.execute(
                select(Company)
                .where(Company.org_id == current.org_id)
                .order_by(Company.created_at.desc())
            )
        )
        .scalars()
        .all()
    )
    return [CompanyOut.model_validate(r) for r in rows]


@router.post("", response_model=CompanyOut, status_code=201)
async def create_company(body: CompanyIn, current: Cur, db: DB) -> CompanyOut:
    await ensure_exists(db, User, body.owner_id, current.org_id, "Ответственный")
    row = Company(
        org_id=current.org_id,
        **body.model_dump(exclude={"owner_id"}),
        owner_id=body.owner_id or current.user.id,
    )
    db.add(row)
    await db.commit()
    return CompanyOut.model_validate(row)


@router.patch("/{company_id}", response_model=CompanyOut)
async def patch_company(
    company_id: uuid.UUID, body: CompanyPatch, current: Cur, db: DB
) -> CompanyOut:
    row = await get_or_404(db, Company, company_id, current.org_id)
    await ensure_exists(db, User, body.owner_id, current.org_id, "Ответственный")
    apply_patch(row, body)
    await db.commit()
    return CompanyOut.model_validate(row)


@router.delete("/{company_id}", status_code=204)
async def delete_company(company_id: uuid.UUID, current: Admin, db: DB) -> None:
    row = await get_or_404(db, Company, company_id, current.org_id)
    used = (
        await db.execute(
            select(
                or_(
                    exists().where(Deal.company_id == row.id),
                    exists().where(Contact.company_id == row.id),
                )
            )
        )
    ).scalar()
    if used:
        raise HTTPException(409, "У компании есть сделки или контакты — сначала удалите их")
    await db.delete(row)
    await db.commit()
