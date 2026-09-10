from datetime import UTC, datetime

from fastapi import APIRouter, Cookie, HTTPException, Response
from sqlalchemy import delete, select

from app.core.deps import DB, Cfg, Cur, Current, clear_session_cookie, start_session
from app.core.security import hash_password, hash_token, verify_password
from app.models import Organization, Session, User
from app.schemas import (
    AcceptInviteIn,
    ChangePasswordIn,
    ForgotPasswordIn,
    InviteInfo,
    LoginIn,
    Me,
    MePatch,
    RegisterIn,
    ResetInfo,
    ResetPasswordIn,
)
from app.services import mail, tokens
from app.services.onboarding import build_me
from app.services.pipeline import add_stages

router = APIRouter(prefix="/auth")


async def _email_taken(db, email: str) -> bool:
    return (
        await db.execute(select(User.id).where(User.email == email.lower()))
    ).scalar_one_or_none() is not None


@router.post("/register", response_model=Me, status_code=201)
async def register(body: RegisterIn, db: DB, settings: Cfg, response: Response) -> Me:
    if await _email_taken(db, body.email):
        raise HTTPException(409, "Эта почта уже зарегистрирована")
    org = Organization(name=body.org_name, currency=body.currency)
    db.add(org)
    await db.flush()
    user = User(
        org_id=org.id,
        name=body.name,
        email=body.email.lower(),
        password_hash=hash_password(body.password),
        role="owner",
        status="active",
    )
    db.add(user)
    await add_stages(db, org.id, body.pipeline_template)
    await db.flush()
    await start_session(db, user, response, settings)
    return await build_me(db, Current(user=user, org=org))


@router.post("/login", response_model=Me)
async def login(body: LoginIn, db: DB, settings: Cfg, response: Response) -> Me:
    user = (
        await db.execute(select(User).where(User.email == body.email.lower()))
    ).scalar_one_or_none()
    if user is None or not verify_password(body.password, user.password_hash):
        raise HTTPException(401, "Неверная почта или пароль")
    if user.status == "disabled":
        raise HTTPException(403, "Доступ отключён администратором")
    if user.status == "invited":
        raise HTTPException(403, "Сначала примите приглашение по ссылке из письма")
    org = await db.get(Organization, user.org_id)
    assert org is not None
    await start_session(db, user, response, settings)
    return await build_me(db, Current(user=user, org=org))


@router.post("/logout", status_code=204)
async def logout(
    db: DB, settings: Cfg, response: Response, session: str | None = Cookie(default=None)
) -> None:
    if session:
        await db.execute(delete(Session).where(Session.token_hash == hash_token(session)))
        await db.commit()
    clear_session_cookie(response, settings)


@router.get("/me", response_model=Me)
async def me(current: Cur, db: DB) -> Me:
    return await build_me(db, current)


@router.patch("/me", response_model=Me)
async def patch_me(body: MePatch, current: Cur, db: DB) -> Me:
    if body.name is not None:
        current.user.name = body.name
    await db.commit()
    return await build_me(db, current)


@router.post("/change-password", status_code=204)
async def change_password(body: ChangePasswordIn, current: Cur, db: DB) -> None:
    if not verify_password(body.current_password, current.user.password_hash):
        raise HTTPException(400, "Текущий пароль неверный")
    current.user.password_hash = hash_password(body.new_password)
    await db.commit()


@router.get("/invite/{token}", response_model=InviteInfo)
async def invite_info(token: str, db: DB) -> InviteInfo:
    row = await tokens.find_valid(db, "invite", token)
    if row is None:
        raise HTTPException(404, "Приглашение не найдено или уже использовано")
    user = await db.get(User, row.user_id)
    if user is None or user.status != "invited":
        raise HTTPException(404, "Приглашение не найдено или уже использовано")
    org = await db.get(Organization, user.org_id)
    inviter = await db.get(User, row.created_by) if row.created_by else None
    return InviteInfo(
        email=user.email,
        org_name=org.name if org else "",
        inviter_name=inviter.name if inviter else "Администратор",
        role=user.role,
    )


@router.post("/accept-invite", response_model=Me)
async def accept_invite(body: AcceptInviteIn, db: DB, settings: Cfg, response: Response) -> Me:
    row = await tokens.find_valid(db, "invite", body.token)
    user = await db.get(User, row.user_id) if row else None
    if row is None or user is None or user.status != "invited":
        raise HTTPException(404, "Приглашение не найдено или уже использовано")
    user.name = body.name
    user.password_hash = hash_password(body.password)
    user.status = "active"
    row.used_at = datetime.now(UTC)
    org = await db.get(Organization, user.org_id)
    assert org is not None
    await start_session(db, user, response, settings)
    return await build_me(db, Current(user=user, org=org))


@router.post("/forgot-password", status_code=204)
async def forgot_password(body: ForgotPasswordIn, db: DB) -> None:
    # Ответ всегда 204: по нему нельзя узнать, есть ли такая почта.
    user = (
        await db.execute(select(User).where(User.email == body.email.lower()))
    ).scalar_one_or_none()
    if user is None or user.status != "active":
        return
    token = await tokens.issue(db, user.id, "reset", None)
    await db.commit()
    await mail.send_reset(user.email, tokens.url_for("reset", token))


@router.get("/reset/{token}", response_model=ResetInfo)
async def reset_info(token: str, db: DB) -> ResetInfo:
    row = await tokens.find_valid(db, "reset", token)
    user = await db.get(User, row.user_id) if row else None
    if user is None:
        raise HTTPException(404, "Ссылка недействительна или устарела")
    return ResetInfo(email=user.email)


@router.post("/reset-password", status_code=204)
async def reset_password(body: ResetPasswordIn, db: DB) -> None:
    row = await tokens.find_valid(db, "reset", body.token)
    user = await db.get(User, row.user_id) if row else None
    if row is None or user is None:
        raise HTTPException(404, "Ссылка недействительна или устарела")
    user.password_hash = hash_password(body.password)
    row.used_at = datetime.now(UTC)
    # Смена пароля разлогинивает все устройства: иначе сброс не спасает от угона сессии.
    await db.execute(delete(Session).where(Session.user_id == user.id))
    await db.commit()
