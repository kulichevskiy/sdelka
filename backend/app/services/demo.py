"""Демо-данные: набросок Sales HQ, разложенный по текущей организации.

Все даты в seed привязаны к 2026-08-29 и сдвигаются к сегодняшнему дню, чтобы
«просрочено / сегодня / завтра» выглядели одинаково в любой день показа."""

import json
import uuid
from datetime import date
from pathlib import Path

from sqlalchemy import delete, exists, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import Current
from app.models import (
    Activity,
    Company,
    Contact,
    CustomField,
    Deal,
    LossReason,
    Stage,
    Task,
    User,
)

SEED_PATH = Path(__file__).resolve().parents[2].parent / "docs" / "demo-seed.json"
# В Docker-образ docs/ не попадает, поэтому копия лежит рядом с кодом.
LOCAL_SEED_PATH = Path(__file__).with_name("demo-seed.json")
DEMO_OWNER = "u1"  # Анна Соколова — её место занимает текущий пользователь


def load_seed() -> dict:
    path = LOCAL_SEED_PATH if LOCAL_SEED_PATH.exists() else SEED_PATH
    return json.loads(path.read_text(encoding="utf-8"))


async def has_demo(db: AsyncSession, org_id: uuid.UUID) -> bool:
    return bool(
        (
            await db.execute(
                select(exists().where(Company.org_id == org_id, Company.is_demo.is_(True)))
            )
        ).scalar()
    )


async def load_demo(db: AsyncSession, current: Current) -> None:
    seed = load_seed()
    org_id = current.org_id
    base = date.fromisoformat(seed["today"])
    shift = date.today() - base

    def d(value: str | None) -> date | None:
        return date.fromisoformat(value) + shift if value else None

    # Пользователи: Анна — это текущий пользователь, остальные — приглашённые коллеги.
    user_ids: dict[str, uuid.UUID] = {DEMO_OWNER: current.user.id}
    suffix = str(org_id)[:8]
    for u in seed["users"]:
        if u["id"] == DEMO_OWNER:
            continue
        local, _, domain = u["email"].partition("@")
        user = User(
            id=uuid.uuid4(),
            org_id=org_id,
            name=u["name"],
            # Email глобально уникален, поэтому в адрес зашит кусок id организации.
            email=f"{local}+demo-{suffix}@{domain}",
            role="member",
            status="invited",
            is_demo=True,
        )
        db.add(user)
        user_ids[u["id"]] = user.id

    # Стадии: демо-сделки раскладываются по существующим стадиям организации.
    stages = (
        (await db.execute(select(Stage).where(Stage.org_id == org_id).order_by(Stage.order)))
        .scalars()
        .all()
    )
    open_stages = [s for s in stages if not s.is_closing]
    closing = next(s for s in stages if s.is_closing)
    seed_open = sorted((s for s in seed["stages"] if not s["isClosing"]), key=lambda s: s["order"])
    stage_ids: dict[str, uuid.UUID] = {}
    for i, s in enumerate(seed_open):
        stage_ids[s["id"]] = open_stages[i % len(open_stages)].id if open_stages else closing.id
    for s in seed["stages"]:
        if s["isClosing"]:
            stage_ids[s["id"]] = closing.id

    await db.flush()  # без relationship() порядок вставки между таблицами не гарантирован
    company_ids: dict[str, uuid.UUID] = {}
    for c in seed["companies"]:
        row = Company(
            id=uuid.uuid4(),
            org_id=org_id,
            name=c["name"],
            industry=c["industry"],
            website=c["website"],
            phone=c["phone"],
            owner_id=user_ids[c["ownerId"]],
            note=c["note"],
            is_demo=True,
        )
        db.add(row)
        company_ids[c["id"]] = row.id

    await db.flush()
    contact_ids: dict[str, uuid.UUID] = {}
    for p in seed["contacts"]:
        row = Contact(
            id=uuid.uuid4(),
            org_id=org_id,
            name=p["name"],
            position=p["position"],
            company_id=company_ids[p["companyId"]],
            email=p["email"],
            phone=p["phone"],
            owner_id=user_ids[p["ownerId"]],
            is_demo=True,
        )
        db.add(row)
        contact_ids[p["id"]] = row.id

    await db.flush()
    deal_ids: dict[str, uuid.UUID] = {}
    for x in seed["deals"]:
        stage_id = stage_ids[x["stageId"]]
        row = Deal(
            id=uuid.uuid4(),
            org_id=org_id,
            title=x["title"],
            company_id=company_ids[x["companyId"]],
            contact_id=contact_ids.get(x["contactId"]),
            owner_id=user_ids[x["ownerId"]],
            stage_id=stage_id,
            amount=x["amount"],
            expected_close_date=d(x["expectedCloseDate"]),
            created_on=d(x["createdAt"]),
            # Открытая сделка на закрывающей стадии (пустая воронка) получает исход:
            # без него панель сделки ждёт то, чего нет.
            outcome=(x["outcome"] or "won") if stage_id == closing.id else None,
            lost_reason=x["lostReason"] if stage_id == closing.id else None,
            description=x["description"],
            is_demo=True,
        )
        db.add(row)
        deal_ids[x["id"]] = row.id

    await db.flush()
    for t in seed["tasks"]:
        db.add(
            Task(
                org_id=org_id,
                deal_id=deal_ids[t["dealId"]],
                title=t["title"],
                due_date=d(t["dueDate"]),
                is_done=t["isDone"],
                assignee_id=user_ids[t["assigneeId"]],
                is_demo=True,
            )
        )

    await db.flush()
    for a in seed["activities"]:
        db.add(
            Activity(
                org_id=org_id,
                company_id=company_ids[a["companyId"]],
                contact_id=contact_ids.get(a["contactId"]) if a["contactId"] else None,
                deal_id=deal_ids.get(a["dealId"]) if a["dealId"] else None,
                type=a["type"],
                author_id=user_ids[a["authorId"]],
                date=d(a["date"]),
                note=a["note"],
                is_demo=True,
            )
        )

    await db.flush()
    # Настройки — не демо: добавляем только недостающие по имени.
    existing_fields = set(
        (await db.execute(select(CustomField.name).where(CustomField.org_id == org_id)))
        .scalars()
        .all()
    )
    for i, f in enumerate(seed["customFields"]):
        if f["name"] not in existing_fields:
            db.add(
                CustomField(
                    org_id=org_id,
                    name=f["name"],
                    entity=f["entity"],
                    type=f["type"],
                    is_required=f["isRequired"],
                    options=f["options"],
                    order=i,
                )
            )
    existing_reasons = set(
        (await db.execute(select(LossReason.name).where(LossReason.org_id == org_id)))
        .scalars()
        .all()
    )
    for r in seed["lossReasons"]:
        if r["name"] not in existing_reasons:
            db.add(LossReason(org_id=org_id, name=r["name"]))

    await db.commit()


async def clear_demo(db: AsyncSession, current: Current) -> None:
    org_id = current.org_id
    demo_users = (
        (await db.execute(select(User.id).where(User.org_id == org_id, User.is_demo.is_(True))))
        .scalars()
        .all()
    )

    # Настоящие записи могли получить демо-коллегу ответственным — переводим на текущего,
    # иначе удаление пользователей упрётся в FK.
    if demo_users:
        me = current.user.id
        for model, col in (
            (Company, Company.owner_id),
            (Contact, Contact.owner_id),
            (Deal, Deal.owner_id),
            (Task, Task.assignee_id),
            (Activity, Activity.author_id),
        ):
            await db.execute(
                update(model)
                .where(model.org_id == org_id, model.is_demo.is_(False), col.in_(demo_users))
                .values({col.key: me})
            )

    # Настоящие записи, привязанные к демо-клиентам, теряют смысл без них:
    # ссылки на необязательные поля обнуляем, обязательные — удаляем вместе с записью.
    demo_companies = select(Company.id).where(Company.org_id == org_id, Company.is_demo.is_(True))
    demo_contacts = select(Contact.id).where(Contact.org_id == org_id, Contact.is_demo.is_(True))
    demo_deals = select(Deal.id).where(Deal.org_id == org_id, Deal.is_demo.is_(True))
    await db.execute(
        update(Activity)
        .where(Activity.org_id == org_id, Activity.deal_id.in_(demo_deals))
        .values(deal_id=None)
    )
    await db.execute(
        update(Activity)
        .where(Activity.org_id == org_id, Activity.contact_id.in_(demo_contacts))
        .values(contact_id=None)
    )
    await db.execute(
        update(Deal)
        .where(Deal.org_id == org_id, Deal.contact_id.in_(demo_contacts))
        .values(contact_id=None)
    )
    await db.execute(
        delete(Activity).where(Activity.org_id == org_id, Activity.company_id.in_(demo_companies))
    )
    await db.execute(
        delete(Task).where(
            Task.org_id == org_id,
            Task.deal_id.in_(
                select(Deal.id).where(Deal.org_id == org_id, Deal.company_id.in_(demo_companies))
            ),
        )
    )
    await db.execute(delete(Deal).where(Deal.org_id == org_id, Deal.company_id.in_(demo_companies)))
    await db.execute(
        delete(Contact).where(Contact.org_id == org_id, Contact.company_id.in_(demo_companies))
    )
    await db.execute(delete(Company).where(Company.org_id == org_id, Company.is_demo.is_(True)))
    await db.execute(delete(User).where(User.org_id == org_id, User.is_demo.is_(True)))
    await db.commit()
