"""Сборка ответа Me: пользователь, организация и состояние чеклиста запуска.
Пункты чеклиста считаются из данных, а не хранятся — иначе разъедутся с реальностью."""

from sqlalchemy import exists, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import Current
from app.models import Company, Contact, Deal, Task, User
from app.schemas import Me, MeUser, Onboarding, OnboardingItem, OrgOut


async def build_onboarding(db: AsyncSession, current: Current) -> Onboarding:
    org_id = current.org_id

    async def any_of(model) -> bool:
        return bool((await db.execute(select(exists().where(model.org_id == org_id)))).scalar())

    user_count = (
        await db.execute(select(func.count()).select_from(User).where(User.org_id == org_id))
    ).scalar_one()
    has_demo = bool(
        (
            await db.execute(
                select(exists().where(Company.org_id == org_id, Company.is_demo.is_(True)))
            )
        ).scalar()
    )
    items = [
        OnboardingItem(key="deal", done=await any_of(Deal)),
        OnboardingItem(key="contact", done=await any_of(Contact)),
        OnboardingItem(key="invite", done=user_count > 1),
        OnboardingItem(key="pipeline", done=current.org.pipeline_customized),
        OnboardingItem(key="task", done=await any_of(Task)),
    ]
    return Onboarding(
        dismissed=current.user.onboarding_dismissed, items=items, has_demo_data=has_demo
    )


async def build_me(db: AsyncSession, current: Current) -> Me:
    return Me(
        user=MeUser.model_validate(current.user),
        org=OrgOut.model_validate(current.org),
        onboarding=await build_onboarding(db, current),
    )
