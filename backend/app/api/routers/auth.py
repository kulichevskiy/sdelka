import uuid
from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Cookie, HTTPException, Response
from fastapi.responses import JSONResponse
from sqlalchemy import delete, func, select, update

from app.core.deps import (
    DB,
    BrowserCur,
    Cfg,
    Cur,
    Current,
    SystemDB,
    clear_session_cookie,
    start_session,
)
from app.core.security import hash_password, hash_token, new_api_token, verify_password
from app.models import ApiToken, Organization, Session, Token, User
from app.schemas import (
    AcceptInviteIn,
    ApiTokenCreated,
    ApiTokenIn,
    ApiTokenOut,
    ChangePasswordIn,
    ForgotPasswordIn,
    InviteInfo,
    LoginIn,
    Me,
    MePatch,
    RegisterIn,
    ResendVerificationIn,
    ResetInfo,
    ResetPasswordIn,
    VerificationPending,
    VerifyEmailIn,
)
from app.services import mail, tokens
from app.services.onboarding import build_me
from app.services.pipeline import add_stages

# Эндпоинты без пользователя (вход, регистрация, одноразовые ссылки) работают через
# SystemDB в обход RLS: организации у запроса ещё нет. Остальные — под RLS, через DB.
router = APIRouter(prefix="/auth")

MAX_API_TOKENS = 20
# Повторное письмо с подтверждением — не чаще раза в минуту на адрес.
VERIFY_RESEND_INTERVAL = timedelta(seconds=60)
# Код для фронтенда: по нему страница входа предлагает выслать письмо ещё раз.
UNVERIFIED_HEADERS = {"X-Error-Code": "email_unverified"}


async def _email_taken(db, email: str) -> bool:
    return (
        await db.execute(select(User.id).where(User.email == email.lower()))
    ).scalar_one_or_none() is not None


@router.post(
    "/register",
    response_model=Me,
    status_code=201,
    responses={202: {"model": VerificationPending}},
)
async def register(body: RegisterIn, db: SystemDB, settings: Cfg, response: Response):
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
        # Без почты подтверждать нечем: аккаунт рабочий сразу.
        email_verified_at=None if settings.mail_enabled else datetime.now(UTC),
    )
    db.add(user)
    await add_stages(db, org.id, body.pipeline_template)
    await db.flush()
    if settings.mail_enabled:
        token = await tokens.issue(db, user.id, "verify", None)
        await db.commit()
        await mail.send_verify(user.email, user.name, tokens.url_for("verify", token))
        pending = VerificationPending(email=user.email)
        return JSONResponse(pending.model_dump(by_alias=True), status_code=202)
    await start_session(db, user, response, settings)
    return await build_me(db, Current(user=user, org=org))


@router.post("/verify-email", response_model=Me)
async def verify_email(body: VerifyEmailIn, db: SystemDB, settings: Cfg, response: Response) -> Me:
    row = await tokens.find_valid(db, "verify", body.token)
    user = await db.get(User, row.user_id) if row else None
    if row is None or user is None or user.status != "active":
        raise HTTPException(404, "Ссылка недействительна или устарела")
    user.email_verified_at = user.email_verified_at or datetime.now(UTC)
    row.used_at = datetime.now(UTC)
    org = await db.get(Organization, user.org_id)
    assert org is not None
    await start_session(db, user, response, settings)
    return await build_me(db, Current(user=user, org=org))


@router.post("/resend-verification", status_code=204)
async def resend_verification(body: ResendVerificationIn, db: SystemDB) -> None:
    # Ответ всегда 204: по нему нельзя узнать, есть ли такая почта.
    user = (
        await db.execute(select(User).where(User.email == body.email.lower()))
    ).scalar_one_or_none()
    if user is None or user.status != "active" or user.email_verified_at is not None:
        return
    last = (
        await db.execute(
            select(func.max(Token.created_at)).where(
                Token.user_id == user.id, Token.kind == "verify"
            )
        )
    ).scalar_one_or_none()
    if last is not None and datetime.now(UTC) - last < VERIFY_RESEND_INTERVAL:
        return
    token = await tokens.issue(db, user.id, "verify", None)
    await db.commit()
    await mail.send_verify(user.email, user.name, tokens.url_for("verify", token))


@router.post("/login", response_model=Me)
async def login(body: LoginIn, db: SystemDB, settings: Cfg, response: Response) -> Me:
    user = (
        await db.execute(select(User).where(User.email == body.email.lower()))
    ).scalar_one_or_none()
    if user is None or not verify_password(body.password, user.password_hash):
        raise HTTPException(401, "Неверная почта или пароль")
    if user.status == "disabled":
        raise HTTPException(403, "Доступ отключён администратором")
    if user.status == "invited":
        raise HTTPException(403, "Сначала примите приглашение по ссылке из письма")
    if user.email_verified_at is None:
        raise HTTPException(
            403, "Сначала подтвердите почту по ссылке из письма", headers=UNVERIFIED_HEADERS
        )
    org = await db.get(Organization, user.org_id)
    assert org is not None
    await start_session(db, user, response, settings)
    return await build_me(db, Current(user=user, org=org))


@router.post("/logout", status_code=204)
async def logout(
    db: SystemDB, settings: Cfg, response: Response, session: str | None = Cookie(default=None)
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
async def change_password(body: ChangePasswordIn, current: BrowserCur, db: DB) -> None:
    if not verify_password(body.current_password, current.user.password_hash):
        raise HTTPException(400, "Текущий пароль неверный")
    current.user.password_hash = hash_password(body.new_password)
    await db.commit()
    await mail.send_password_changed(current.user.email)


@router.get("/api-tokens", response_model=list[ApiTokenOut])
async def list_api_tokens(current: BrowserCur, db: DB) -> list[ApiTokenOut]:
    rows = (
        (
            await db.execute(
                select(ApiToken)
                .where(ApiToken.user_id == current.user.id)
                .order_by(ApiToken.created_at.desc())
            )
        )
        .scalars()
        .all()
    )
    return [ApiTokenOut.model_validate(r) for r in rows]


@router.post("/api-tokens", response_model=ApiTokenCreated, status_code=201)
async def create_api_token(body: ApiTokenIn, current: BrowserCur, db: DB) -> ApiTokenCreated:
    count = (
        await db.execute(
            select(func.count()).select_from(ApiToken).where(ApiToken.user_id == current.user.id)
        )
    ).scalar_one()
    if count >= MAX_API_TOKENS:
        raise HTTPException(409, f"Не больше {MAX_API_TOKENS} токенов: отзовите ненужные")
    token = new_api_token()
    row = ApiToken(
        user_id=current.user.id,
        name=body.name.strip(),
        token_hash=hash_token(token),
        prefix=token[:8],
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return ApiTokenCreated(**ApiTokenOut.model_validate(row).model_dump(), token=token)


@router.delete("/api-tokens/{token_id}", status_code=204)
async def revoke_api_token(token_id: uuid.UUID, current: BrowserCur, db: DB) -> None:
    row = (
        await db.execute(
            select(ApiToken).where(ApiToken.id == token_id, ApiToken.user_id == current.user.id)
        )
    ).scalar_one_or_none()
    if row is None:
        raise HTTPException(404, "Не найдено")
    await db.delete(row)
    await db.commit()


@router.get("/invite/{token}", response_model=InviteInfo)
async def invite_info(token: str, db: SystemDB) -> InviteInfo:
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
async def accept_invite(
    body: AcceptInviteIn, db: SystemDB, settings: Cfg, response: Response
) -> Me:
    row = await tokens.find_valid(db, "invite", body.token)
    user = await db.get(User, row.user_id) if row else None
    if row is None or user is None or user.status != "invited":
        raise HTTPException(404, "Приглашение не найдено или уже использовано")
    user.name = body.name
    user.password_hash = hash_password(body.password)
    user.status = "active"
    # Ссылка пришла на эту почту (или её передал админ) — отдельное подтверждение не нужно.
    user.email_verified_at = datetime.now(UTC)
    row.used_at = datetime.now(UTC)
    org = await db.get(Organization, user.org_id)
    assert org is not None
    await start_session(db, user, response, settings)
    return await build_me(db, Current(user=user, org=org))


@router.post("/forgot-password", status_code=204)
async def forgot_password(body: ForgotPasswordIn, db: SystemDB) -> None:
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
async def reset_info(token: str, db: SystemDB) -> ResetInfo:
    row = await tokens.find_valid(db, "reset", token)
    user = await db.get(User, row.user_id) if row else None
    if user is None:
        raise HTTPException(404, "Ссылка недействительна или устарела")
    return ResetInfo(email=user.email)


@router.post("/reset-password", status_code=204)
async def reset_password(body: ResetPasswordIn, db: SystemDB) -> None:
    row = await tokens.find_valid(db, "reset", body.token)
    user = await db.get(User, row.user_id) if row else None
    if row is None or user is None:
        raise HTTPException(404, "Ссылка недействительна или устарела")
    user.password_hash = hash_password(body.password)
    row.used_at = datetime.now(UTC)
    # Ссылку сброса, пришедшую письмом, мог открыть только владелец почты.
    if row.created_by is None and user.email_verified_at is None:
        user.email_verified_at = datetime.now(UTC)
    # Смена пароля разлогинивает все устройства и отзывает API-токены: иначе сброс
    # не спасает от угона сессии или токена.
    await db.execute(delete(Session).where(Session.user_id == user.id))
    await db.execute(delete(ApiToken).where(ApiToken.user_id == user.id))
    # Ссылка подтверждения тоже даёт вход — после сброса она работать не должна.
    await db.execute(
        update(Token)
        .where(Token.user_id == user.id, Token.kind == "verify", Token.used_at.is_(None))
        .values(used_at=datetime.now(UTC))
    )
    await db.commit()
    await mail.send_password_changed(user.email)
