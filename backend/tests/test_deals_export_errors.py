from unittest.mock import patch

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.main import app
from app.models import CustomField, Deal
from tests.conftest import make_company, make_deal, register
from tests.test_deals_export import parse_export


@pytest.mark.parametrize("entity", [CustomField, Deal])
async def test_query_failure_never_returns_csv_attachment(client, entity):
    await register(client)
    execute = AsyncSession.execute

    async def fail_export_query(self, statement, *args, **kwargs):
        if any(d.get("entity") is entity for d in getattr(statement, "column_descriptions", [])):
            raise RuntimeError("controlled export query failure")
        return await execute(self, statement, *args, **kwargs)

    async with AsyncClient(
        transport=ASGITransport(app=app, raise_app_exceptions=False),
        base_url="http://testserver",
        cookies=client.cookies,
    ) as failing:
        with patch.object(AsyncSession, "execute", fail_export_query):
            response = await failing.get("/api/deals/export.csv")
    assert response.status_code == 500
    assert "content-disposition" not in response.headers
    assert not response.headers["content-type"].startswith("text/csv")


async def test_all_custom_field_types_nulls_and_duplicate_names(client):
    await register(client)
    company = await make_company(client)
    field_ids = []
    for kind in ("text", "number", "date", "select", "text"):
        response = await client.post(
            "/api/custom-fields",
            json={
                "name": "Дополнительное поле",
                "entity": "deal",
                "type": kind,
                "isRequired": False,
                "options": ["Вариант"],
            },
        )
        assert response.status_code == 201
        field_ids.append(response.json()["id"])
    deal = await make_deal(client, company["id"])
    response = await client.patch(
        f"/api/deals/{deal['id']}",
        json={
            "amount": -12.34,
            "customValues": dict(
                zip(field_ids, ["Текст", 0, "2026-09-11", "Вариант", None], strict=True)
            ),
        },
    )
    assert response.status_code == 200
    rows = parse_export(await client.get("/api/deals/export.csv"))
    assert rows[0][-5:] == ["Дополнительное поле"] * 5
    assert rows[1][-5:] == ["Текст", "0", "2026-09-11", "Вариант", ""]
    assert rows[1][6] == "-12.34"
