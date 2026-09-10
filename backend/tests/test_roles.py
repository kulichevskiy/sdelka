from tests.conftest import invite_and_accept, register


async def test_member_forbidden_in_admin_endpoints(client):
    await register(client)
    member = await invite_and_accept(client)
    assert (await member.post("/api/stages", json={"name": "x"})).status_code == 403
    assert (await member.post("/api/users/invite", json={"email": "a@b.co"})).status_code == 403
    assert (
        await member.post(
            "/api/custom-fields", json={"name": "x", "entity": "deal", "type": "text"}
        )
    ).status_code == 403
    assert (await member.post("/api/loss-reasons", json={"name": "x"})).status_code == 403
    assert (await member.patch("/api/org", json={"name": "x"})).status_code == 403
    assert (await member.post("/api/org/demo-data")).status_code == 403
    # Но обычная работа доступна.
    assert (await member.post("/api/companies", json={"name": "ООО"})).status_code == 201


async def test_owner_cannot_be_demoted_and_admin_limits(client):
    me = await register(client)
    owner_id = me["user"]["id"]
    admin = await invite_and_accept(client, role="admin")
    admin_id = (await admin.get("/api/auth/me")).json()["user"]["id"]
    member = await invite_and_accept(client)
    member_id = (await member.get("/api/auth/me")).json()["user"]["id"]

    # Владельца не трогают, себя не трогают.
    assert (await admin.patch(f"/api/users/{owner_id}", json={"role": "member"})).status_code == 403
    assert (
        await admin.patch(f"/api/users/{admin_id}", json={"status": "disabled"})
    ).status_code == 403
    # Админ управляет участниками, но не другими админами.
    assert (await admin.patch(f"/api/users/{member_id}", json={"role": "admin"})).status_code == 200
    assert (
        await admin.patch(f"/api/users/{member_id}", json={"role": "member"})
    ).status_code == 403
    # Владелец может всё, кроме себя.
    assert (
        await client.patch(f"/api/users/{member_id}", json={"role": "member"})
    ).status_code == 200
    assert (
        await client.patch(f"/api/users/{owner_id}", json={"role": "member"})
    ).status_code == 403

    # Отключение убивает сессию.
    assert (
        await client.patch(f"/api/users/{member_id}", json={"status": "disabled"})
    ).status_code == 200
    assert (await member.get("/api/auth/me")).status_code == 401

    # Передача владения — только владелец.
    assert (await admin.post(f"/api/users/{owner_id}/transfer-ownership")).status_code == 403
    assert (await client.post(f"/api/users/{admin_id}/transfer-ownership")).status_code == 204
    assert (await client.get("/api/auth/me")).json()["user"]["role"] == "admin"
    assert (await admin.get("/api/auth/me")).json()["user"]["role"] == "owner"
