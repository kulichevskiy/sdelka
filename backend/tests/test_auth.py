from tests.conftest import invite_and_accept, new_client, register, unique_email


async def test_register_login_me_logout(client):
    me = await register(client, email="anna@example.com")
    assert me["user"]["role"] == "owner"
    assert me["org"]["currency"] == "RUB"
    assert {i["key"] for i in me["onboarding"]["items"]} == {
        "deal",
        "contact",
        "invite",
        "pipeline",
        "task",
    }
    assert not any(i["done"] for i in me["onboarding"]["items"])

    r = await client.get("/api/auth/me")
    assert r.status_code == 200 and r.json()["user"]["email"] == "anna@example.com"

    r = await client.post("/api/auth/logout")
    assert r.status_code == 204
    r = await client.get("/api/auth/me")
    assert r.status_code == 401

    r = await client.post(
        "/api/auth/login", json={"email": "anna@example.com", "password": "wrong"}
    )
    assert r.status_code == 401
    r = await client.post(
        "/api/auth/login", json={"email": "Anna@example.com", "password": "secret123"}
    )
    assert r.status_code == 200
    assert "session" in r.cookies


async def test_register_duplicate_email(client):
    await register(client, email="dup@example.com")
    r = await client.post(
        "/api/auth/register",
        json={"name": "x", "email": "dup@example.com", "password": "secret123", "orgName": "y"},
    )
    assert r.status_code == 409


async def test_pipeline_templates(client):
    await register(client, pipelineTemplate="empty")
    stages = (await client.get("/api/stages")).json()
    assert [s["isClosing"] for s in stages] == [True]

    other = await new_client()
    await register(other)
    stages = (await other.get("/api/stages")).json()
    assert len(stages) == 5 and stages[-1]["isClosing"] and not stages[0]["isClosing"]


async def test_invite_flow(client):
    await register(client)
    email = unique_email("invitee")
    r = await client.post("/api/users/invite", json={"email": email, "role": "admin"})
    assert r.status_code == 201
    data = r.json()
    assert data["user"]["status"] == "invited" and data["inviteUrl"].startswith(
        "http://testserver/invite/"
    )
    token = data["inviteUrl"].rsplit("/", 1)[1]

    # Приглашённый не может войти по паролю, пока не примет приглашение.
    anon = await new_client()
    r = await anon.get(f"/api/auth/invite/{token}")
    assert r.status_code == 200 and r.json()["email"] == email and r.json()["role"] == "admin"

    r = await anon.post(
        "/api/auth/accept-invite", json={"token": token, "name": "Пётр", "password": "secret123"}
    )
    assert r.status_code == 200 and r.json()["user"]["role"] == "admin"
    # Токен одноразовый.
    r = await anon.get(f"/api/auth/invite/{token}")
    assert r.status_code == 404

    users = (await client.get("/api/users")).json()
    assert {u["status"] for u in users} == {"active"} and len(users) == 2
    me = (await client.get("/api/auth/me")).json()
    assert next(i for i in me["onboarding"]["items"] if i["key"] == "invite")["done"]


async def test_reset_link_and_password_change(client):
    await register(client)
    member = await invite_and_accept(client)
    member_id = (await member.get("/api/auth/me")).json()["user"]["id"]
    r = await client.post(f"/api/users/{member_id}/reset-link")
    assert r.status_code == 200
    token = r.json()["resetUrl"].rsplit("/", 1)[1]
    anon = await new_client()
    assert (await anon.get(f"/api/auth/reset/{token}")).status_code == 200
    r = await anon.post("/api/auth/reset-password", json={"token": token, "password": "newpass123"})
    assert r.status_code == 204
    # Старые сессии сброшены.
    assert (await member.get("/api/auth/me")).status_code == 401
    email = (await client.get("/api/users")).json()
    email = next(u["email"] for u in email if u["id"] == member_id)
    r = await anon.post("/api/auth/login", json={"email": email, "password": "newpass123"})
    assert r.status_code == 200


async def test_forgot_password_is_silent(client):
    r = await client.post("/api/auth/forgot-password", json={"email": "nobody@example.com"})
    assert r.status_code == 204
