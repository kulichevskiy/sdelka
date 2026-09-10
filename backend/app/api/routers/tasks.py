import uuid

from fastapi import APIRouter
from sqlalchemy import select

from app.api.common import apply_patch, ensure_exists, get_or_404
from app.core.deps import DB, Cur
from app.models import Deal, Task, User
from app.schemas import TaskIn, TaskOut, TaskPatch

router = APIRouter(prefix="/tasks")


@router.get("", response_model=list[TaskOut])
async def list_tasks(current: Cur, db: DB) -> list[TaskOut]:
    rows = (
        (
            await db.execute(
                select(Task)
                .where(Task.org_id == current.org_id)
                .order_by(Task.due_date, Task.created_at)
            )
        )
        .scalars()
        .all()
    )
    return [TaskOut.model_validate(r) for r in rows]


@router.post("", response_model=TaskOut, status_code=201)
async def create_task(body: TaskIn, current: Cur, db: DB) -> TaskOut:
    await ensure_exists(db, Deal, body.deal_id, current.org_id, "Сделка")
    await ensure_exists(db, User, body.assignee_id, current.org_id, "Исполнитель")
    row = Task(
        org_id=current.org_id,
        **body.model_dump(exclude={"assignee_id"}),
        assignee_id=body.assignee_id or current.user.id,
    )
    db.add(row)
    await db.commit()
    return TaskOut.model_validate(row)


@router.patch("/{task_id}", response_model=TaskOut)
async def patch_task(task_id: uuid.UUID, body: TaskPatch, current: Cur, db: DB) -> TaskOut:
    row = await get_or_404(db, Task, task_id, current.org_id)
    await ensure_exists(db, User, body.assignee_id, current.org_id, "Исполнитель")
    apply_patch(row, body)
    await db.commit()
    return TaskOut.model_validate(row)


@router.delete("/{task_id}", status_code=204)
async def delete_task(task_id: uuid.UUID, current: Cur, db: DB) -> None:
    row = await get_or_404(db, Task, task_id, current.org_id)
    await db.delete(row)
    await db.commit()
