from datetime import timedelta

from app.api.routers import auth
from tests.conftest import link_token, new_client, unique_email

BODY = {"name": "Анна", "password": "secret123", "orgName": "Тест"}


async def _register(client, email: str):
    return await client.post("/api/auth/register", json={**BODY, "email": email})


async def test_registration_requires_email_confirmation(client, outbox):
    email = unique_email()
    r = await _register(client, email)
    assert r.status_code == 202
    assert r.json() == {"verificationRequired": True, "email": email}
    assert "session" not in r.cookies
    assert (await client.get("/api/auth/me")).status_code == 401

    # До подтверждения войти нельзя, и фронтенд узнаёт причину по коду.
    r = await client.post("/api/auth/login", json={"email": email, "password": "secret123"})
    assert r.status_code == 403 and r.headers["X-Error-Code"] == "email_unverified"
    # Неверный пароль не раскрывает, что почта не подтверждена.
    r = await client.post("/api/auth/login", json={"email": email, "password": "wrong-pass"})
    assert r.status_code == 401

    assert len(outbox) == 1 and outbox[0]["to"] == email
    token = link_token(outbox[0], "verify")

    anon = await new_client()
    r = await anon.post("/api/auth/verify-email", json={"token": token})
    assert r.status_code == 200 and r.json()["user"]["email"] == email
    assert (await anon.get("/api/auth/me")).status_code == 200
    # Ссылка одноразовая.
    assert (await anon.post("/api/auth/verify-email", json={"token": token})).status_code == 404

    r = await client.post("/api/auth/login", json={"email": email, "password": "secret123"})
    assert r.status_code == 200


async def test_verify_rejects_unknown_token(client):
    r = await client.post("/api/auth/verify-email", json={"token": "nope"})
    assert r.status_code == 404


async def test_resend_verification(client, outbox, monkeypatch):
    email = unique_email()
    await _register(client, email)

    # Сразу после регистрации повтор не уходит: защита от засыпания ящика письмами.
    r = await client.post("/api/auth/resend-verification", json={"email": email})
    assert r.status_code == 204 and len(outbox) == 1

    monkeypatch.setattr(auth, "VERIFY_RESEND_INTERVAL", timedelta(0))
    r = await client.post("/api/auth/resend-verification", json={"email": email})
    assert r.status_code == 204 and len(outbox) == 2

    # Новая ссылка гасит прежнюю.
    old, new = link_token(outbox[0], "verify"), link_token(outbox[1], "verify")
    assert (await client.post("/api/auth/verify-email", json={"token": old})).status_code == 404
    assert (await client.post("/api/auth/verify-email", json={"token": new})).status_code == 200

    # Подтверждённым и несуществующим адресам письма не уходят, ответ тот же.
    for address in (email, "nobody@example.com"):
        r = await client.post("/api/auth/resend-verification", json={"email": address})
        assert r.status_code == 204
    assert len(outbox) == 2


async def test_password_reset_by_email_confirms_address(client, outbox):
    email = unique_email()
    await _register(client, email)
    r = await client.post("/api/auth/forgot-password", json={"email": email})
    assert r.status_code == 204
    reset = next(m for m in outbox if "/reset/" in m["body"])
    token = link_token(reset, "reset")

    r = await client.post(
        "/api/auth/reset-password", json={"token": token, "password": "newpass123"}
    )
    assert r.status_code == 204
    assert outbox[-1]["subject"].startswith("Пароль изменён")

    # Ссылку из письма мог открыть только владелец почты — отдельное подтверждение не нужно.
    r = await client.post("/api/auth/login", json={"email": email, "password": "newpass123"})
    assert r.status_code == 200
    # Старая ссылка подтверждения после сброса не даёт войти.
    verify = link_token(outbox[0], "verify")
    assert (await client.post("/api/auth/verify-email", json={"token": verify})).status_code == 404


async def test_change_password_sends_notification(client, outbox):
    email = unique_email()
    await _register(client, email)
    token = link_token(outbox[0], "verify")
    await client.post("/api/auth/verify-email", json={"token": token})

    r = await client.post(
        "/api/auth/change-password",
        json={"currentPassword": "secret123", "newPassword": "newpass123"},
    )
    assert r.status_code == 204
    assert outbox[-1]["to"] == email and outbox[-1]["subject"].startswith("Пароль изменён")


async def test_invited_user_needs_no_separate_confirmation(client, outbox):
    email = unique_email()
    await _register(client, email)
    await client.post("/api/auth/verify-email", json={"token": link_token(outbox[0], "verify")})

    invitee = unique_email("m")
    r = await client.post("/api/users/invite", json={"email": invitee, "role": "member"})
    assert r.status_code == 201
    token = link_token(outbox[-1], "invite")
    member = await new_client()
    r = await member.post(
        "/api/auth/accept-invite", json={"token": token, "name": "Пётр", "password": "secret123"}
    )
    assert r.status_code == 200
    await member.post("/api/auth/logout")
    r = await member.post("/api/auth/login", json={"email": invitee, "password": "secret123"})
    assert r.status_code == 200
