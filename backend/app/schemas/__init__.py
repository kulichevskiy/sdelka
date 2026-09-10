"""Схемы API. На проводе camelCase — те же имена, что во фронтенде и наброске."""

import uuid
from datetime import date as date_
from datetime import datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_serializer
from pydantic.alias_generators import to_camel

Role = Literal["owner", "admin", "member"]
InviteRole = Literal["admin", "member"]
UserStatus = Literal["active", "invited", "disabled"]
Currency = Literal["RUB", "USD", "EUR"]
DealOutcome = Literal["won", "lost"]
ActivityType = Literal["call", "email", "meeting", "note"]
FieldEntity = Literal["deal", "contact", "company"]
FieldType = Literal["text", "number", "date", "select"]
OnboardingKey = Literal["deal", "contact", "invite", "pipeline", "task"]
CustomValues = dict[str, str | float | int | None]


class CamelModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, from_attributes=True)


# --- Auth ---


class RegisterIn(CamelModel):
    name: str = Field(min_length=1, max_length=200)
    email: EmailStr
    password: str = Field(min_length=8, max_length=200)
    org_name: str = Field(min_length=1, max_length=200)
    currency: Currency = "RUB"
    pipeline_template: Literal["standard", "empty"] = "standard"


class LoginIn(CamelModel):
    email: EmailStr
    password: str


class MeUser(CamelModel):
    id: uuid.UUID
    name: str
    email: str
    role: Role


class OrgOut(CamelModel):
    id: uuid.UUID
    name: str
    currency: Currency
    created_at: datetime


class OnboardingItem(CamelModel):
    key: OnboardingKey
    done: bool


class Onboarding(CamelModel):
    dismissed: bool
    items: list[OnboardingItem]
    has_demo_data: bool


class Me(CamelModel):
    user: MeUser
    org: OrgOut
    onboarding: Onboarding


class MePatch(CamelModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)


class ChangePasswordIn(CamelModel):
    current_password: str
    new_password: str = Field(min_length=8, max_length=200)


class InviteInfo(CamelModel):
    email: str
    org_name: str
    inviter_name: str
    role: Role


class AcceptInviteIn(CamelModel):
    token: str
    name: str = Field(min_length=1, max_length=200)
    password: str = Field(min_length=8, max_length=200)


class ForgotPasswordIn(CamelModel):
    email: EmailStr


class ResetInfo(CamelModel):
    email: str


class ResetPasswordIn(CamelModel):
    token: str
    password: str = Field(min_length=8, max_length=200)


# --- Org ---


class OrgPatch(CamelModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    currency: Currency | None = None


# --- Users ---


class UserOut(CamelModel):
    id: uuid.UUID
    name: str
    email: str
    role: Role
    status: UserStatus
    created_at: datetime


class InviteIn(CamelModel):
    email: EmailStr
    role: InviteRole = "member"


class InviteOut(CamelModel):
    user: UserOut
    invite_url: str | None


class InviteUrlOut(CamelModel):
    invite_url: str


class ResetUrlOut(CamelModel):
    reset_url: str


class UserPatch(CamelModel):
    role: InviteRole | None = None
    status: Literal["active", "disabled"] | None = None


# --- Stages ---


class StageOut(CamelModel):
    id: uuid.UUID
    name: str
    order: int
    is_closing: bool


class StageIn(CamelModel):
    name: str = Field(min_length=1, max_length=100)


class StageOrderIn(CamelModel):
    ids: list[uuid.UUID]


# --- Companies / contacts ---


class CompanyOut(CamelModel):
    id: uuid.UUID
    name: str
    industry: str
    website: str
    phone: str
    owner_id: uuid.UUID
    note: str
    custom_values: CustomValues
    created_at: datetime


class CompanyIn(CamelModel):
    name: str = Field(min_length=1, max_length=200)
    industry: str = ""
    website: str = ""
    phone: str = ""
    owner_id: uuid.UUID | None = None
    note: str = ""
    custom_values: CustomValues = Field(default_factory=dict)


class CompanyPatch(CamelModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    industry: str | None = None
    website: str | None = None
    phone: str | None = None
    owner_id: uuid.UUID | None = None
    note: str | None = None
    custom_values: CustomValues | None = None


class ContactOut(CamelModel):
    id: uuid.UUID
    name: str
    position: str
    company_id: uuid.UUID
    email: str
    phone: str
    owner_id: uuid.UUID
    custom_values: CustomValues
    created_at: datetime


class ContactIn(CamelModel):
    name: str = Field(min_length=1, max_length=200)
    company_id: uuid.UUID
    position: str = ""
    email: str = ""
    phone: str = ""
    owner_id: uuid.UUID | None = None
    custom_values: CustomValues = Field(default_factory=dict)


class ContactPatch(CamelModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    position: str | None = None
    company_id: uuid.UUID | None = None
    email: str | None = None
    phone: str | None = None
    owner_id: uuid.UUID | None = None
    custom_values: CustomValues | None = None


# --- Deals ---


class DealOut(CamelModel):
    id: uuid.UUID
    title: str
    company_id: uuid.UUID
    contact_id: uuid.UUID | None
    owner_id: uuid.UUID
    stage_id: uuid.UUID
    amount: Decimal
    expected_close_date: date_ | None
    created_at: date_ = Field(validation_alias="created_on")
    outcome: DealOutcome | None
    lost_reason: str | None
    description: str
    custom_values: CustomValues

    @field_serializer("amount")
    def _amount(self, value: Decimal) -> float:
        # На проводе number, а не строка: фронтенд складывает суммы в колонках.
        return float(value)


class DealIn(CamelModel):
    title: str = Field(min_length=1, max_length=300)
    company_id: uuid.UUID
    contact_id: uuid.UUID | None = None
    amount: Decimal = Decimal(0)
    owner_id: uuid.UUID | None = None
    expected_close_date: date_ | None = None
    description: str = ""
    custom_values: CustomValues = Field(default_factory=dict)


class DealPatch(CamelModel):
    title: str | None = Field(default=None, min_length=1, max_length=300)
    company_id: uuid.UUID | None = None
    contact_id: uuid.UUID | None = None
    owner_id: uuid.UUID | None = None
    amount: Decimal | None = None
    expected_close_date: date_ | None = None
    description: str | None = None
    custom_values: CustomValues | None = None


class DealMoveIn(CamelModel):
    stage_id: uuid.UUID
    outcome: DealOutcome | None = None
    lost_reason: str | None = None


# --- Tasks / activities ---


class TaskOut(CamelModel):
    id: uuid.UUID
    deal_id: uuid.UUID
    title: str
    due_date: date_
    is_done: bool
    assignee_id: uuid.UUID


class TaskIn(CamelModel):
    deal_id: uuid.UUID
    title: str = Field(min_length=1, max_length=500)
    due_date: date_
    assignee_id: uuid.UUID | None = None


class TaskPatch(CamelModel):
    title: str | None = Field(default=None, min_length=1, max_length=500)
    due_date: date_ | None = None
    is_done: bool | None = None
    assignee_id: uuid.UUID | None = None


class ActivityOut(CamelModel):
    id: uuid.UUID
    company_id: uuid.UUID
    contact_id: uuid.UUID | None
    deal_id: uuid.UUID | None
    type: ActivityType
    author_id: uuid.UUID
    date: date_
    note: str


class ActivityIn(CamelModel):
    company_id: uuid.UUID
    contact_id: uuid.UUID | None = None
    deal_id: uuid.UUID | None = None
    type: ActivityType
    note: str = Field(min_length=1)
    date: date_ | None = None


# --- Settings ---


class CustomFieldOut(CamelModel):
    id: uuid.UUID
    name: str
    entity: FieldEntity
    type: FieldType
    is_required: bool
    options: list[str]
    order: int


class CustomFieldIn(CamelModel):
    name: str = Field(min_length=1, max_length=100)
    entity: FieldEntity
    type: FieldType
    is_required: bool = False
    options: list[str] = Field(default_factory=list)


class CustomFieldPatch(CamelModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    is_required: bool | None = None
    options: list[str] | None = None


class LossReasonOut(CamelModel):
    id: uuid.UUID
    name: str
    usage_count: int


class LossReasonIn(CamelModel):
    name: str = Field(min_length=1, max_length=300)
