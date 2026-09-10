from datetime import date

from tests.conftest import invite_and_accept, make_company, make_deal, register


async def test_demo_data_load_and_clear(client):
    me = await register(client)
    own_company = await make_company(client, "Своя компания")
    own_deal = await make_deal(client, own_company["id"], "Своя сделка")

    r = await client.post("/api/org/demo-data")
    assert r.status_code == 204
    assert (await client.post("/api/org/demo-data")).status_code == 409

    deals = (await client.get("/api/deals")).json()
    assert len(deals) == 14
    users = (await client.get("/api/users")).json()
    assert len(users) == 6 and sum(u["status"] == "invited" for u in users) == 5
    # Сделки Анны переписаны на текущего пользователя, коллеги — на демо-приглашённых.
    owners = {d["ownerId"] for d in deals}
    assert me["user"]["id"] in owners and len(owners) > 1
    # Даты сдвинуты к сегодняшнему дню: в seed есть задача на «сегодня».
    tasks = (await client.get("/api/tasks")).json()
    assert any(t["dueDate"] == date.today().isoformat() for t in tasks)
    onboarding = (await client.get("/api/auth/me")).json()["onboarding"]
    assert onboarding["hasDemoData"]
    fields = (await client.get("/api/custom-fields")).json()
    assert len(fields) == 7

    # Настоящая сделка получила демо-коллегу ответственным — очистка не должна упасть.
    demo_user = next(u for u in users if u["status"] == "invited")
    await client.patch(f"/api/deals/{own_deal['id']}", json={"ownerId": demo_user["id"]})

    assert (await client.delete("/api/org/demo-data")).status_code == 204
    deals = (await client.get("/api/deals")).json()
    assert [d["title"] for d in deals] == ["Своя сделка"]
    assert deals[0]["ownerId"] == me["user"]["id"]
    assert len((await client.get("/api/users")).json()) == 1
    assert len((await client.get("/api/companies")).json()) == 1
    # Настройки остаются.
    assert len((await client.get("/api/custom-fields")).json()) == 7
    assert not (await client.get("/api/auth/me")).json()["onboarding"]["hasDemoData"]


async def test_demo_with_empty_pipeline(client):
    await register(client, pipelineTemplate="empty")
    assert (await client.post("/api/org/demo-data")).status_code == 204
    stages = (await client.get("/api/stages")).json()
    deals = (await client.get("/api/deals")).json()
    assert {d["stageId"] for d in deals} == {stages[0]["id"]}
    # На закрывающей стадии у всех есть исход — иначе панель сделки сломается.
    assert all(d["outcome"] in ("won", "lost") for d in deals)


async def test_onboarding_dismiss(client):
    await register(client)
    r = await client.post("/api/org/onboarding/dismiss")
    assert r.status_code == 200 and r.json()["dismissed"] is True
    member = await invite_and_accept(client)
    assert (await member.get("/api/auth/me")).json()["onboarding"]["dismissed"] is False
