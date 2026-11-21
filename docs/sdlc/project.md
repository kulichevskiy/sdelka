# Профиль проекта для SDLC

status: ready
Собран агентом в режиме full-send 2026-11-21 из `AGENTS.md` и `.github/workflows/deploy.yml`; пользователь его не вычитывал.

- Правила репозитория: `AGENTS.md`. Контракт API: `docs/api-contract.md`.
- Артефакты задач: `docs/feat-{slug}/`.
- Целевая ветка PR: `main`. Пуш в `main` запускает деплой на VPS.
- Обязательные проверки (те же, что в CI):
  - бэкенд: `uv sync --frozen && uv run ruff check . && uv run ruff format --check . && TEST_DATABASE_URL=… uv run pytest -q` на Postgres 16;
  - фронтенд: `npm ci && npx tsc --noEmit && npm run build`.
- Мерж: по `AGENTS.md` агент не мержит и не деплоит. Исключение — прямое поручение владельца репозитория в текущем разговоре.
- Секреты: `.env` не читать и не печатать.
