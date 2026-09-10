from fastapi import APIRouter, HTTPException

from app.api.common import apply_patch
from app.core.deps import DB, Admin, Cur
from app.schemas import Onboarding, OrgOut, OrgPatch
from app.services import demo
from app.services.onboarding import build_onboarding

router = APIRouter(prefix="/org")


@router.get("", response_model=OrgOut)
async def get_org(current: Cur) -> OrgOut:
    return OrgOut.model_validate(current.org)


@router.patch("", response_model=OrgOut)
async def patch_org(body: OrgPatch, current: Admin, db: DB) -> OrgOut:
    apply_patch(current.org, body)
    await db.commit()
    return OrgOut.model_validate(current.org)


@router.post("/onboarding/dismiss", response_model=Onboarding)
async def dismiss_onboarding(current: Cur, db: DB) -> Onboarding:
    current.user.onboarding_dismissed = True
    await db.commit()
    return await build_onboarding(db, current)


@router.post("/demo-data", status_code=204)
async def load_demo(current: Admin, db: DB) -> None:
    if await demo.has_demo(db, current.org_id):
        raise HTTPException(409, "Демо-данные уже загружены")
    await demo.load_demo(db, current)


@router.delete("/demo-data", status_code=204)
async def clear_demo(current: Admin, db: DB) -> None:
    await demo.clear_demo(db, current)
