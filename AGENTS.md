# Сделка — заметки для агентов

## Секреты
Секреты не читать, не печатать, не передавать в URL, заголовках, истории shell, коммитах, PR, Kanban и логах. `.env` в корне не открывать: всё нужное для проверок берётся из `.env.example` и переменных окружения.

## Стек и границы
- `backend/` — FastAPI + SQLAlchemy 2.0 (async) + PostgreSQL 16 + Alembic, зависимости через `uv` (Python 3.12).
- `frontend/` — React 19 + Vite + Tailwind 4 + TanStack Query (Node 22). Типы API генерируются из OpenAPI: `npm run gen:api`.
- Контракт API — `docs/api-contract.md`: меняешь эндпоинт, меняешь контракт и типы.
- Изоляция тенантов — фильтр по `org_id` в коде, без RLS. Любое изменение доступа к данным сопровождается тестом на изоляцию.
- Пуш в `main` автоматически деплоит продакшен (`.github/workflows/deploy.yml`). Мержить, включать auto-merge и деплоить агент не может.

## Проверки
Те же команды, что в CI. Тесты бэкенда ходят в настоящий Postgres.

```sh
# бэкенд: Postgres + uv sync --frozen + ruff check + ruff format --check + pytest
cd backend && uv sync --frozen && uv run ruff check . && uv run ruff format --check . \
  && TEST_DATABASE_URL=postgresql+asyncpg://crm:crm@localhost:5432/crm_test uv run pytest -q

# фронтенд
cd frontend && npm ci && npx tsc --noEmit && npm run build
```

В контейнере фабрики Postgres поднимается командой `factory-pg-start`, а весь бэкенд-набор запускается одной командой `factory-test-backend /workspace`. Контейнер эфемерный: Postgres и тесты запускать одной shell-командой, не в разных.

## Дисциплина
- Минимальное поддерживаемое изменение под принятый scope, без попутных рефакторингов.
- Тесты на каждое изменённое поведение, миграция Alembic на каждое изменение схемы.
- Не заявлять, что проверка прошла, если команда не завершилась успешно в этом рабочем дереве.
- После трёх безуспешных итераций правки остановиться и описать блокер, а не продолжать.
