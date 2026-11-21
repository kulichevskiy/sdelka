from tests.conftest import invite_and_accept, make_company, make_deal, new_client, register


async def _issue(client, name: str = "Интеграция") -> dict:
    r = await client.post("/api/auth/api-tokens", json={"name": name})
    assert r.status_code == 201, r.text
    return r.json()


def _bearer(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


async def test_token_is_shown_once_and_authorizes_requests(client):
    me = await register(client)
    company = await make_company(client)
    await make_deal(client, company["id"])

    created = await _issue(client)
    token = created["token"]
    assert token.startswith("sdl_") and created["prefix"] == token[:8]
    assert created["lastUsedAt"] is None

    # В списке токена уже нет — только начало.
    listed = (await client.get("/api/auth/api-tokens")).json()
    assert len(listed) == 1 and "token" not in listed[0] and listed[0]["name"] == "Интеграция"

    api = await new_client()
    r = await api.get("/api/auth/me", headers=_bearer(token))
    assert r.status_code == 200 and r.json()["user"]["id"] == me["user"]["id"]
    assert len((await api.get("/api/deals", headers=_bearer(token))).json()) == 1
    r = await api.post("/api/companies", json={"name": "Через API"}, headers=_bearer(token))
    assert r.status_code == 201

    listed = (await client.get("/api/auth/api-tokens")).json()
    assert listed[0]["lastUsedAt"] is not None


async def test_token_sees_only_its_organization(client):
    await register(client)
    company = await make_company(client)
    deal = await make_deal(client, company["id"])

    other = await new_client()
    await register(other)
    token = (await _issue(other))["token"]

    api = await new_client()
    assert (await api.get("/api/deals", headers=_bearer(token))).json() == []
    assert (await api.get("/api/companies", headers=_bearer(token))).json() == []
    r = await api.patch(f"/api/deals/{deal['id']}", json={"title": "x"}, headers=_bearer(token))
    assert r.status_code == 404
    r = await api.post(
        "/api/deals", json={"title": "x", "companyId": company["id"]}, headers=_bearer(token)
    )
    assert r.status_code == 422


async def test_invalid_token_is_rejected_even_with_session_cookie(client):
    await register(client)
    assert (await client.get("/api/deals")).status_code == 200
    r = await client.get("/api/deals", headers=_bearer("sdl_wrong"))
    assert r.status_code == 401
    api = await new_client()
    assert (await api.get("/api/deals")).status_code == 401


async def test_token_cannot_manage_access(client):
    await register(client)
    token = (await _issue(client))["token"]
    api = await new_client()
    headers = _bearer(token)

    assert (await api.get("/api/auth/api-tokens", headers=headers)).status_code == 403
    r = await api.post("/api/auth/api-tokens", json={"name": "ещё"}, headers=headers)
    assert r.status_code == 403
    r = await api.post(
        "/api/auth/change-password",
        json={"currentPassword": "secret123", "newPassword": "newpass123"},
        headers=headers,
    )
    assert r.status_code == 403


async def test_token_cannot_manage_people(client):
    """Ссылки приглашения и сброса дают вход в приложение: токеном их не выпустить."""
    me = await register(client)
    member = await invite_and_accept(client)
    member_id = (await member.get("/api/auth/me")).json()["user"]["id"]
    headers = _bearer((await _issue(client))["token"])
    api = await new_client()

    calls = [
        ("post", f"/api/users/{me['user']['id']}/reset-link", None),
        ("post", f"/api/users/{member_id}/reset-link", None),
        ("post", "/api/users/invite", {"email": "x@example.com", "role": "admin"}),
        ("post", f"/api/users/{member_id}/transfer-ownership", None),
        ("patch", f"/api/users/{member_id}", {"role": "admin"}),
    ]
    for method, path, body in calls:
        r = await api.request(method, path, json=body, headers=headers)
        assert r.status_code == 403, path
    # Читать список людей токеном можно.
    assert (await api.get("/api/users", headers=headers)).status_code == 200


async def test_revoke(client):
    await register(client)
    created = await _issue(client)
    api = await new_client()
    assert (await api.get("/api/deals", headers=_bearer(created["token"]))).status_code == 200

    assert (await client.delete(f"/api/auth/api-tokens/{created['id']}")).status_code == 204
    assert (await api.get("/api/deals", headers=_bearer(created["token"]))).status_code == 401
    assert (await client.get("/api/auth/api-tokens")).json() == []


async def test_tokens_are_personal_within_organization(client):
    await register(client)
    owner_token = await _issue(client)
    member = await invite_and_accept(client)

    # Коллега из той же организации чужих токенов не видит и отозвать не может.
    assert (await member.get("/api/auth/api-tokens")).json() == []
    r = await member.delete(f"/api/auth/api-tokens/{owner_token['id']}")
    assert r.status_code == 404
    assert len((await client.get("/api/auth/api-tokens")).json()) == 1


async def test_token_carries_role_of_its_user(client):
    await register(client)
    member = await invite_and_accept(client)
    token = (await _issue(member))["token"]
    api = await new_client()
    r = await api.post("/api/stages", json={"name": "Новая"}, headers=_bearer(token))
    assert r.status_code == 403


async def test_disabling_user_and_password_reset_revoke_tokens(client):
    await register(client)
    member = await invite_and_accept(client)
    member_id = (await member.get("/api/auth/me")).json()["user"]["id"]
    api = await new_client()

    token = (await _issue(member))["token"]
    r = await client.post(f"/api/users/{member_id}/reset-link")
    reset = r.json()["resetUrl"].rsplit("/", 1)[1]
    r = await api.post("/api/auth/reset-password", json={"token": reset, "password": "newpass123"})
    assert r.status_code == 204
    assert (await api.get("/api/deals", headers=_bearer(token))).status_code == 401

    email = next(
        u["email"] for u in (await client.get("/api/users")).json() if u["id"] == member_id
    )
    r = await member.post("/api/auth/login", json={"email": email, "password": "newpass123"})
    assert r.status_code == 200
    token = (await _issue(member))["token"]
    r = await client.patch(f"/api/users/{member_id}", json={"status": "disabled"})
    assert r.status_code == 200
    assert (await api.get("/api/deals", headers=_bearer(token))).status_code == 401


async def test_token_limit(client, monkeypatch):
    from app.api.routers import auth

    monkeypatch.setattr(auth, "MAX_API_TOKENS", 2)
    await register(client)
    await _issue(client, "1")
    await _issue(client, "2")
    r = await client.post("/api/auth/api-tokens", json={"name": "3"})
    assert r.status_code == 409
