import uuid

from fastapi import APIRouter, HTTPException, Query
from sqlalchemy import func, select, update

from app.api.common import get_or_404
from app.core.deps import DB, Admin, Cur
from app.models import Deal, Stage
from app.schemas import StageIn, StageOrderIn, StageOut

router = APIRouter(prefix="/stages")


async def _ordered(db, org_id) -> list[Stage]:
    return list(
        (await db.execute(select(Stage).where(Stage.org_id == org_id).order_by(Stage.order)))
        .scalars()
        .all()
    )


def _renumber(stages: list[Stage]) -> None:
    # Закрывающая стадия всегда последняя — на ней держится логика исходов.
    stages.sort(key=lambda s: (bool(s.is_closing), s.order))
    for i, s in enumerate(stages):
        s.order = i + 1


@router.get("", response_model=list[StageOut])
async def list_stages(current: Cur, db: DB) -> list[StageOut]:
    return [StageOut.model_validate(s) for s in await _ordered(db, current.org_id)]


@router.post("", response_model=StageOut, status_code=201)
async def add_stage(body: StageIn, current: Admin, db: DB) -> StageOut:
    stages = await _ordered(db, current.org_id)
    stage = Stage(org_id=current.org_id, name=body.name, order=len(stages), is_closing=False)
    stages.append(stage)
    _renumber(stages)
    db.add(stage)
    current.org.pipeline_customized = True
    await db.commit()
    return StageOut.model_validate(stage)


@router.put("/order", response_model=list[StageOut])
async def reorder(body: StageOrderIn, current: Admin, db: DB) -> list[StageOut]:
    stages = await _ordered(db, current.org_id)
    if set(body.ids) != {s.id for s in stages}:
        raise HTTPException(422, "Список стадий должен быть полным")
    position = {sid: i for i, sid in enumerate(body.ids)}
    for s in stages:
        s.order = position[s.id]
    _renumber(stages)
    current.org.pipeline_customized = True
    await db.commit()
    return [StageOut.model_validate(s) for s in sorted(stages, key=lambda s: s.order)]


@router.patch("/{stage_id}", response_model=StageOut)
async def rename(stage_id: uuid.UUID, body: StageIn, current: Admin, db: DB) -> StageOut:
    stage = await get_or_404(db, Stage, stage_id, current.org_id)
    stage.name = body.name
    current.org.pipeline_customized = True
    await db.commit()
    return StageOut.model_validate(stage)


@router.delete("/{stage_id}", status_code=204)
async def delete_stage(
    stage_id: uuid.UUID,
    current: Admin,
    db: DB,
    move_to: uuid.UUID | None = Query(default=None, alias="moveTo"),
) -> None:
    stage = await get_or_404(db, Stage, stage_id, current.org_id)
    if stage.is_closing:
        raise HTTPException(409, "Закрывающую стадию удалить нельзя")
    count = (
        await db.execute(select(func.count()).select_from(Deal).where(Deal.stage_id == stage.id))
    ).scalar_one()
    if count:
        if move_to is None:
            raise HTTPException(409, "На стадии есть сделки — укажите, куда их перенести")
        target = await get_or_404(db, Stage, move_to, current.org_id)
        if target.id == stage.id:
            raise HTTPException(422, "Нельзя перенести сделки на удаляемую стадию")
        if target.is_closing:
            raise HTTPException(422, "Перенос на закрывающую стадию требует исхода у каждой сделки")
        await db.execute(update(Deal).where(Deal.stage_id == stage.id).values(stage_id=target.id))
    await db.delete(stage)
    await db.flush()
    stages = await _ordered(db, current.org_id)
    _renumber(stages)
    current.org.pipeline_customized = True
    await db.commit()
