from tests.conftest import make_company, make_deal, new_client, register


async def test_tenants_are_isolated(client):
    await register(client)
    company = await make_company(client)
    deal = await make_deal(client, company["id"])
    stage_id = (await client.get("/api/stages")).json()[0]["id"]

    other = await new_client()
    await register(other)

    assert (await other.get("/api/deals")).json() == []
    assert (await other.get("/api/companies")).json() == []
    assert (await other.get("/api/users")).json().__len__() == 1

    # Чужие объекты неотличимы от несуществующих.
    assert (await other.patch(f"/api/deals/{deal['id']}", json={"title": "x"})).status_code == 404
    assert (await other.delete(f"/api/deals/{deal['id']}")).status_code == 404
    assert (
        await other.patch(f"/api/companies/{company['id']}", json={"name": "x"})
    ).status_code == 404
    assert (await other.delete(f"/api/stages/{stage_id}")).status_code == 404

    # Ссылка на чужую компанию в теле запроса — 422, а не создание кросс-тенантной сделки.
    r = await other.post("/api/deals", json={"title": "x", "companyId": company["id"]})
    assert r.status_code == 422
    r = await other.post(
        "/api/tasks", json={"dealId": deal["id"], "title": "x", "dueDate": "2026-01-01"}
    )
    assert r.status_code == 422

    # Свои данные на месте.
    assert len((await client.get("/api/deals")).json()) == 1
