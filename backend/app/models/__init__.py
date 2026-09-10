"""Модель данных. Все доменные таблицы несут org_id и составной уникальный ключ
(org_id, id): ссылки между сущностями идут через составные FK, поэтому сделка одной
организации физически не может указывать на стадию или контакт другой."""

import uuid
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    ForeignKeyConstraint,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base


def _uuid() -> Mapped[uuid.UUID]:
    return mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)


def _created_at() -> Mapped[datetime]:
    return mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)


def _org_fk() -> Mapped[uuid.UUID]:
    return mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False
    )


class Organization(Base):
    __tablename__ = "organizations"

    id: Mapped[uuid.UUID] = _uuid()
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), nullable=False, default="RUB")
    # Онбординг: стадии когда-либо правили руками.
    pipeline_customized: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = _created_at()


class User(Base):
    __tablename__ = "users"
    __table_args__ = (UniqueConstraint("org_id", "id", name="uq_users_org_id_id"),)

    id: Mapped[uuid.UUID] = _uuid()
    org_id: Mapped[uuid.UUID] = _org_fk()
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    # Один email = один аккаунт = одна организация, поэтому уникальность глобальная.
    email: Mapped[str] = mapped_column(String(320), nullable=False, unique=True)
    password_hash: Mapped[str | None] = mapped_column(String(300))
    role: Mapped[str] = mapped_column(String(10), nullable=False)  # owner | admin | member
    status: Mapped[str] = mapped_column(String(10), nullable=False)  # active | invited | disabled
    onboarding_dismissed: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    is_demo: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = _created_at()


class Session(Base):
    __tablename__ = "sessions"

    id: Mapped[uuid.UUID] = _uuid()
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    token_hash: Mapped[str] = mapped_column(String(64), nullable=False, unique=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    created_at: Mapped[datetime] = _created_at()


class Token(Base):
    """Одноразовые ссылки: приглашение или сброс пароля."""

    __tablename__ = "tokens"

    id: Mapped[uuid.UUID] = _uuid()
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    kind: Mapped[str] = mapped_column(String(10), nullable=False)  # invite | reset
    token_hash: Mapped[str] = mapped_column(String(64), nullable=False, unique=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL")
    )
    created_at: Mapped[datetime] = _created_at()


class Stage(Base):
    __tablename__ = "stages"
    __table_args__ = (UniqueConstraint("org_id", "id", name="uq_stages_org_id_id"),)

    id: Mapped[uuid.UUID] = _uuid()
    org_id: Mapped[uuid.UUID] = _org_fk()
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    order: Mapped[int] = mapped_column(Integer, nullable=False)
    is_closing: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)


class Company(Base):
    __tablename__ = "companies"
    __table_args__ = (
        UniqueConstraint("org_id", "id", name="uq_companies_org_id_id"),
        ForeignKeyConstraint(["org_id", "owner_id"], ["users.org_id", "users.id"]),
    )

    id: Mapped[uuid.UUID] = _uuid()
    org_id: Mapped[uuid.UUID] = _org_fk()
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    industry: Mapped[str] = mapped_column(String(200), nullable=False, default="")
    website: Mapped[str] = mapped_column(String(300), nullable=False, default="")
    phone: Mapped[str] = mapped_column(String(50), nullable=False, default="")
    owner_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    note: Mapped[str] = mapped_column(Text, nullable=False, default="")
    custom_values: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    is_demo: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = _created_at()


class Contact(Base):
    __tablename__ = "contacts"
    __table_args__ = (
        UniqueConstraint("org_id", "id", name="uq_contacts_org_id_id"),
        ForeignKeyConstraint(["org_id", "company_id"], ["companies.org_id", "companies.id"]),
        ForeignKeyConstraint(["org_id", "owner_id"], ["users.org_id", "users.id"]),
    )

    id: Mapped[uuid.UUID] = _uuid()
    org_id: Mapped[uuid.UUID] = _org_fk()
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    position: Mapped[str] = mapped_column(String(200), nullable=False, default="")
    company_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    email: Mapped[str] = mapped_column(String(320), nullable=False, default="")
    phone: Mapped[str] = mapped_column(String(50), nullable=False, default="")
    owner_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    custom_values: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    is_demo: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = _created_at()


class Deal(Base):
    __tablename__ = "deals"
    __table_args__ = (
        UniqueConstraint("org_id", "id", name="uq_deals_org_id_id"),
        ForeignKeyConstraint(["org_id", "company_id"], ["companies.org_id", "companies.id"]),
        ForeignKeyConstraint(["org_id", "contact_id"], ["contacts.org_id", "contacts.id"]),
        ForeignKeyConstraint(["org_id", "owner_id"], ["users.org_id", "users.id"]),
        ForeignKeyConstraint(["org_id", "stage_id"], ["stages.org_id", "stages.id"]),
    )

    id: Mapped[uuid.UUID] = _uuid()
    org_id: Mapped[uuid.UUID] = _org_fk()
    title: Mapped[str] = mapped_column(String(300), nullable=False)
    company_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    contact_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))
    owner_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    stage_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False, default=0)
    expected_close_date: Mapped[date | None] = mapped_column(Date)
    # Дата создания как бизнес-поле (в наброске createdAt — YYYY-MM-DD), отдельно от метки времени.
    created_on: Mapped[date] = mapped_column(Date, nullable=False, default=date.today)
    outcome: Mapped[str | None] = mapped_column(String(5))  # won | lost
    lost_reason: Mapped[str | None] = mapped_column(String(300))
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    custom_values: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    is_demo: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = _created_at()


class Task(Base):
    __tablename__ = "tasks"
    __table_args__ = (
        UniqueConstraint("org_id", "id", name="uq_tasks_org_id_id"),
        ForeignKeyConstraint(
            ["org_id", "deal_id"], ["deals.org_id", "deals.id"], ondelete="CASCADE"
        ),
        ForeignKeyConstraint(["org_id", "assignee_id"], ["users.org_id", "users.id"]),
    )

    id: Mapped[uuid.UUID] = _uuid()
    org_id: Mapped[uuid.UUID] = _org_fk()
    deal_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    due_date: Mapped[date] = mapped_column(Date, nullable=False)
    is_done: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    assignee_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    is_demo: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = _created_at()


class Activity(Base):
    __tablename__ = "activities"
    __table_args__ = (
        UniqueConstraint("org_id", "id", name="uq_activities_org_id_id"),
        ForeignKeyConstraint(["org_id", "company_id"], ["companies.org_id", "companies.id"]),
        ForeignKeyConstraint(["org_id", "contact_id"], ["contacts.org_id", "contacts.id"]),
        ForeignKeyConstraint(["org_id", "deal_id"], ["deals.org_id", "deals.id"]),
        ForeignKeyConstraint(["org_id", "author_id"], ["users.org_id", "users.id"]),
    )

    id: Mapped[uuid.UUID] = _uuid()
    org_id: Mapped[uuid.UUID] = _org_fk()
    company_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    contact_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))
    deal_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))
    type: Mapped[str] = mapped_column(String(10), nullable=False)  # call | email | meeting | note
    author_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    date: Mapped[date] = mapped_column(Date, nullable=False)
    note: Mapped[str] = mapped_column(Text, nullable=False, default="")
    is_demo: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = _created_at()


class CustomField(Base):
    __tablename__ = "custom_fields"

    id: Mapped[uuid.UUID] = _uuid()
    org_id: Mapped[uuid.UUID] = _org_fk()
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    entity: Mapped[str] = mapped_column(String(10), nullable=False)  # deal | contact | company
    type: Mapped[str] = mapped_column(String(10), nullable=False)  # text | number | date | select
    is_required: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    options: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)


class LossReason(Base):
    __tablename__ = "loss_reasons"

    id: Mapped[uuid.UUID] = _uuid()
    org_id: Mapped[uuid.UUID] = _org_fk()
    name: Mapped[str] = mapped_column(String(300), nullable=False)
