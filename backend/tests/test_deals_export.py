import csv
import io

import pytest

from tests.conftest import invite_and_accept, make_company, make_deal, new_client, register

HEADERS = [
    "ID",
    "Название",
    "Компания",
    "Контакт",
    "Ответственный",
    "Стадия",
    "Сумма",
    "Валюта",
    "Дата создания",
    "Ожидаемая дата закрытия",
    "Исход",
    "Причина проигрыша",
    "Описание",
]


def parse_export(response):
    assert response.status_code == 200, response.text
    assert response.headers["content-type"] == "text/csv; charset=utf-8"
    assert response.headers["content-disposition"] == 'attachment; filename="deals.csv"'
    assert response.headers["cache-control"] == "no-store"
    assert response.content.startswith(b"\xef\xbb\xbf")
    return list(csv.reader(io.StringIO(response.content.decode("utf-8-sig"), newline="")))


@pytest.mark.parametrize(
    "value", ["=1+1", "+SUM(1)", "-1+2", "@SUM(1)", "\t=1", "\r=1", "\n=1", "  =1", "\ufeff=1"]
)
async def test_formula_safety_in_values_and_custom_headers(client, value):
    await register(client, name=value)
    company = await make_company(client, value)
    field = await client.post(
        "/api/custom-fields",
        json={
            "name": value,
            "entity": "deal",
            "type": "text",
            "isRequired": False,
        },
    )
    assert field.status_code == 201
    deal = await make_deal(client, company["id"], value)
    response = await client.patch(
        f"/api/deals/{deal['id']}",
        json={
            "description": value,
            "customValues": {field.json()["id"]: value},
        },
    )
    assert response.status_code == 200
    rows = parse_export(await client.get("/api/deals/export.csv"))
    assert rows[0][-1] == "'" + value
    for index in (1, 2, 4, 12, 13):
        assert rows[1][index] == "'" + value


async def test_export_empty_nulls_and_tenant_scoped_fields(client):
    await register(client, name="Своя организация")
    assert parse_export(await client.get("/api/deals/export.csv")) == [HEADERS]
    company = await make_company(client, "Своя компания")
    deal = await make_deal(client, company["id"])
    async with await new_client() as other:
        await register(other, name="Чужой ответственный")
        foreign_company = await make_company(other, "Чужая компания")
        foreign_deal = await make_deal(other, foreign_company["id"], "Чужая сделка")
        foreign_field = await other.post(
            "/api/custom-fields",
            json={
                "name": "Чужое поле",
                "entity": "deal",
                "type": "text",
                "isRequired": False,
            },
        )
        assert foreign_field.status_code == 201
        own_contact_field = await client.post(
            "/api/custom-fields",
            json={
                "name": "Поле контакта",
                "entity": "contact",
                "type": "text",
                "isRequired": False,
            },
        )
        assert own_contact_field.status_code == 201
        response = await client.patch(
            f"/api/deals/{deal['id']}",
            json={
                "customValues": {
                    foreign_field.json()["id"]: "Не экспортировать",
                    own_contact_field.json()["id"]: "Не экспортировать",
                    "deleted-field": "Не экспортировать",
                }
            },
        )
        assert response.status_code == 200
        rows = parse_export(await client.get("/api/deals/export.csv"))
        assert rows[0] == HEADERS
        assert len(rows) == 2
        assert rows[1][0] == deal["id"]
        assert rows[1][2:5] == ["Своя компания", "", "Своя организация"]
        assert rows[1][9:13] == ["", "", "", ""]
        assert parse_export(await other.get("/api/deals/export.csv"))[1][0] == foreign_deal["id"]


async def test_export_uses_existing_member_permissions_and_rejects_disabled(client):
    assert (await client.get("/api/deals/export.csv")).status_code == 401
    await register(client)
    company = await make_company(client)
    deal = await make_deal(client, company["id"])
    member = await invite_and_accept(client)
    try:
        me = (await member.get("/api/auth/me")).json()
        assert parse_export(await member.get("/api/deals/export.csv"))[1][0] == deal["id"]
        response = await client.patch(
            f"/api/deals/{deal['id']}", json={"ownerId": me["user"]["id"]}
        )
        assert response.status_code == 200
        response = await client.patch(f"/api/users/{me['user']['id']}", json={"status": "disabled"})
        assert response.status_code == 200
        assert (await member.get("/api/deals/export.csv")).status_code == 401
        assert parse_export(await client.get("/api/deals/export.csv"))[1][4] == "Пётр"
    finally:
        await member.aclose()


async def test_export_all_deals_with_names_and_csv_roundtrip(client):
    await register(client, name="Ответственный", currency="EUR")
    company = await make_company(client, 'ООО "Ромашка", отдел; продаж')
    contact = await client.post("/api/contacts", json={"name": "Иван", "companyId": company["id"]})
    assert contact.status_code == 201
    field = await client.post(
        "/api/custom-fields",
        json={"name": "Регион", "entity": "deal", "type": "text", "isRequired": False},
    )
    assert field.status_code == 201
    stages = (await client.get("/api/stages")).json()
    closing = next(s for s in stages if s["isClosing"])
    created = []
    for outcome in (None, "won", "lost"):
        deal = await make_deal(client, company["id"], f"Сделка {outcome}")
        patch = await client.patch(
            f"/api/deals/{deal['id']}",
            json={
                "contactId": contact.json()["id"],
                "amount": 1234.56,
                "expectedCloseDate": "2026-12-31",
                "description": 'Строка 1,; "да"\r\nСтрока 2',
                "customValues": {field.json()["id"]: "Москва"},
            },
        )
        assert patch.status_code == 200
        if outcome:
            moved = await client.post(
                f"/api/deals/{deal['id']}/move",
                json={
                    "stageId": closing["id"],
                    "outcome": outcome,
                    "lostReason": "Дорого",
                },
            )
            assert moved.status_code == 200
        created.append(deal)
    rows = parse_export(
        await client.get("/api/deals/export.csv?search=missing&outcome=won&limit=1&offset=100")
    )
    assert rows[0] == HEADERS + ["Регион"]
    assert len(rows) == 4
    by_id = {row[0]: row for row in rows[1:]}
    assert set(by_id) == {d["id"] for d in created}
    for deal, outcome in zip(created, ("", "won", "lost"), strict=True):
        row = by_id[deal["id"]]
        stage = closing if outcome else stages[0]
        assert row == [
            deal["id"],
            deal["title"],
            company["name"],
            "Иван",
            "Ответственный",
            stage["name"],
            "1234.56",
            "EUR",
            deal["createdAt"],
            "2026-12-31",
            outcome,
            "Дорого" if outcome == "lost" else "",
            'Строка 1,; "да"\r\nСтрока 2',
            "Москва",
        ]
