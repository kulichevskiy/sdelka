import uuid

from fastapi import APIRouter, HTTPException
from sqlalchemy import delete, select

from app.api.common import get_or_404
from app.core.db import system_session
from app.core.deps import DB, BrowserAdmin, BrowserOwner, Cur, Current
from app.models import ApiToken, Session, User
from app.schemas import InviteIn, InviteOut, InviteUrlOut, ResetUrlOut, UserOut, UserPatch
from app.services import mail, tokens

router = APIRouter(prefix="/users")


@router.get("", response_model=list[UserOut])
async def list_users(current: Cur, db: DB) -> list[UserOut]:
    rows = (
        (
            await db.execute(
                select(User).where(User.org_id == current.org_id).order_by(User.created_at)
            )
        )
        .scalars()
        .all()
    )
    return [UserOut.model_validate(r) for r in rows]


@router.post("/invite", response_model=InviteOut, status_code=201)
async def invite(body: InviteIn, current: BrowserAdmin, db: DB) -> InviteOut:
    email = body.email.lower()
    # Почта уникальна на всю систему, а RLS показывает только свою организацию —
    # занятость проверяем системной сессией.
    async with system_session() as sysdb:
        taken_org = (
            await sysdb.execute(select(User.org_id).where(User.email == email))
        ).scalar_one_or_none()
    if taken_org is not None:
        detail = (
            "Этот человек уже в организации"
            if taken_org == current.org_id
            else "Эта почта уже используется в другой организации"
        )
        raise HTTPException(409, detail)
    user = User(
        org_id=current.org_id,
        name=email.split("@")[0],
        email=email,
        role=body.role,
        status="invited",
    )
    db.add(user)
    await db.flush()
    token = await tokens.issue(db, user.id, "invite", current.user.id)
    await db.commit()
    url = tokens.url_for("invite", token)
    await mail.send_invite(email, current.org.name, current.user.name, url)
    return InviteOut(user=UserOut.model_validate(user), invite_url=url)


@router.post("/{user_id}/resend-invite", response_model=InviteUrlOut)
async def resend_invite(user_id: uuid.UUID, current: BrowserAdmin, db: DB) -> InviteUrlOut:
    user = await get_or_404(db, User, user_id, current.org_id)
    if user.status != "invited":
        raise HTTPException(409, "Приглашение уже принято")
    token = await tokens.issue(db, user.id, "invite", current.user.id)
    await db.commit()
    url = tokens.url_for("invite", token)
    await mail.send_invite(user.email, current.org.name, current.user.name, url)
    return InviteUrlOut(invite_url=url)


@router.post("/{user_id}/reset-link", response_model=ResetUrlOut)
async def reset_link(user_id: uuid.UUID, current: BrowserAdmin, db: DB) -> ResetUrlOut:
    user = await get_or_404(db, User, user_id, current.org_id)
    if user.status != "active":
        raise HTTPException(409, "Сбросить пароль можно только активному пользователю")
    token = await tokens.issue(db, user.id, "reset", current.user.id)
    await db.commit()
    return ResetUrlOut(reset_url=tokens.url_for("reset", token))


def _check_can_manage(current: Current, target: User) -> None:
    if target.id == current.user.id:
        raise HTTPException(403, "Себе роль и доступ не меняют")
    if target.role == "owner":
        raise HTTPException(403, "Владельца организации изменить нельзя")
    if target.role == "admin" and current.user.role != "owner":
        raise HTTPException(403, "Другого администратора может изменить только владелец")


@router.patch("/{user_id}", response_model=UserOut)
async def patch_user(user_id: uuid.UUID, body: UserPatch, current: BrowserAdmin, db: DB) -> UserOut:
    user = await get_or_404(db, User, user_id, current.org_id)
    _check_can_manage(current, user)
    if body.role is not None:
        user.role = body.role
    if body.status is not None:
        if user.status == "invited":
            raise HTTPException(409, "Приглашённого нельзя отключить — отмените приглашение")
        user.status = body.status
        if body.status == "disabled":
            await db.execute(delete(Session).where(Session.user_id == user.id))
            await db.execute(delete(ApiToken).where(ApiToken.user_id == user.id))
    await db.commit()
    return UserOut.model_validate(user)


@router.post("/{user_id}/transfer-ownership", status_code=204)
async def transfer_ownership(user_id: uuid.UUID, current: BrowserOwner, db: DB) -> None:
    user = await get_or_404(db, User, user_id, current.org_id)
    if user.status != "active":
        raise HTTPException(409, "Передать владение можно только активному пользователю")
    if user.id == current.user.id:
        raise HTTPException(409, "Вы уже владелец")
    user.role = "owner"
    current.user.role = "admin"
    await db.commit()


@router.delete("/{user_id}", status_code=204)
async def cancel_invite(user_id: uuid.UUID, current: BrowserAdmin, db: DB) -> None:
    user = await get_or_404(db, User, user_id, current.org_id)
    if user.status != "invited":
        raise HTTPException(409, "Удалить можно только приглашённого пользователя")
    if user.is_demo:
        raise HTTPException(409, "Это демо-коллега: уберите демо-данные в разделе организации")
    await db.delete(user)
    await db.commit()
