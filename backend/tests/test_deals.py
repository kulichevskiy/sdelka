from tests.conftest import make_company, make_deal, register


async def test_move_to_closing_requires_outcome(client):
    await register(client)
    company = await make_company(client)
    deal = await make_deal(client, company["id"])
    stages = (await client.get("/api/stages")).json()
    closing = next(s for s in stages if s["isClosing"])
    assert deal["stageId"] == stages[0]["id"]

    r = await client.post(f"/api/deals/{deal['id']}/move", json={"stageId": closing["id"]})
    assert r.status_code == 422
    r = await client.post(
        f"/api/deals/{deal['id']}/move", json={"stageId": closing["id"], "outcome": "lost"}
    )
    assert r.status_code == 422
    r = await client.post(
        f"/api/deals/{deal['id']}/move",
        json={"stageId": closing["id"], "outcome": "lost", "lostReason": "Дорого"},
    )
    assert r.status_code == 200 and r.json()["outcome"] == "lost"

    # Причина в справочнике считает использование, переименование догоняет сделки.
    r = await client.post("/api/loss-reasons", json={"name": "Дорого"})
    reason = r.json()
    assert (await client.get("/api/loss-reasons")).json()[0]["usageCount"] == 1
    r = await client.patch(f"/api/loss-reasons/{reason['id']}", json={"name": "Не по бюджету"})
    assert r.json()["usageCount"] == 1
    assert (await client.get("/api/deals")).json()[0]["lostReason"] == "Не по бюджету"

    # Возврат в воронку сбрасывает исход.
    r = await client.post(f"/api/deals/{deal['id']}/move", json={"stageId": stages[1]["id"]})
    assert r.json()["outcome"] is None and r.json()["lostReason"] is None


async def test_deal_crud_tasks_and_custom_values(client):
    me = await register(client)
    company = await make_company(client)
    r = await client.post("/api/contacts", json={"name": "Игорь", "companyId": company["id"]})
    contact = r.json()
    deal = await make_deal(client, company["id"])
    r = await client.patch(
        f"/api/deals/{deal['id']}",
        json={"contactId": contact["id"], "customValues": {"f1": "Сайт"}, "amount": 250.5},
    )
    assert r.status_code == 200
    assert r.json()["customValues"] == {"f1": "Сайт"} and r.json()["amount"] == 250.5

    r = await client.post(
        "/api/tasks", json={"dealId": deal["id"], "title": "Позвонить", "dueDate": "2026-09-10"}
    )
    assert r.status_code == 201 and r.json()["assigneeId"] == me["user"]["id"]
    task = r.json()
    r = await client.patch(f"/api/tasks/{task['id']}", json={"isDone": True})
    assert r.json()["isDone"] is True

    r = await client.post(
        "/api/activities",
        json={"companyId": company["id"], "dealId": deal["id"], "type": "call", "note": "ок"},
    )
    assert r.status_code == 201

    onboarding = (await client.get("/api/auth/me")).json()["onboarding"]
    done = {i["key"] for i in onboarding["items"] if i["done"]}
    assert done == {"deal", "contact", "task"}

    # Удаление контакта обнуляет ссылку у сделки; удаление сделки уносит задачи.
    assert (await client.delete(f"/api/contacts/{contact['id']}")).status_code == 204
    assert (await client.get("/api/deals")).json()[0]["contactId"] is None
    assert (await client.delete(f"/api/deals/{deal['id']}")).status_code == 204
    assert (await client.get("/api/tasks")).json() == []
    assert (await client.get("/api/activities")).json()[0]["dealId"] is None
