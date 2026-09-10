from tests.conftest import make_company, make_deal, register


async def test_delete_stage_with_move_to(client):
    await register(client)
    company = await make_company(client)
    await make_deal(client, company["id"])
    stages = (await client.get("/api/stages")).json()
    first, second, closing = stages[0], stages[1], stages[-1]

    assert (await client.delete(f"/api/stages/{closing['id']}")).status_code == 409
    assert (await client.delete(f"/api/stages/{first['id']}")).status_code == 409
    r = await client.delete(f"/api/stages/{first['id']}", params={"moveTo": closing["id"]})
    assert r.status_code == 422
    r = await client.delete(f"/api/stages/{first['id']}", params={"moveTo": second["id"]})
    assert r.status_code == 204
    assert (await client.get("/api/deals")).json()[0]["stageId"] == second["id"]
    stages = (await client.get("/api/stages")).json()
    assert [s["order"] for s in stages] == [1, 2, 3, 4] and stages[-1]["isClosing"]


async def test_add_and_reorder_keeps_closing_last(client):
    await register(client)
    r = await client.post("/api/stages", json={"name": "Демо"})
    assert r.status_code == 201
    stages = (await client.get("/api/stages")).json()
    assert stages[-1]["isClosing"] and stages[-2]["name"] == "Демо"

    ids = [s["id"] for s in stages]
    shuffled = [ids[-1]] + ids[:-1]  # закрывающую пытаемся поставить первой
    r = await client.put("/api/stages/order", json={"ids": shuffled})
    assert r.status_code == 200
    assert r.json()[-1]["isClosing"]
    assert r.json()[0]["id"] == ids[0]
    me = (await client.get("/api/auth/me")).json()
    assert next(i for i in me["onboarding"]["items"] if i["key"] == "pipeline")["done"]
