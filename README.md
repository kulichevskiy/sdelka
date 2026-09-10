# Сделка (sdelka.app) — CRM для небольших команд продаж

Multi-tenant SaaS: каждая команда регистрирует свою организацию, приглашает коллег
и ведёт сделки, контакты и задачи в изолированном пространстве. Учебный проект,
выросший из кликабельного прототипа.

**Стек:** FastAPI + SQLAlchemy 2.0 (async) + PostgreSQL 16 · React 19 + Vite +
Tailwind 4 + TanStack Query · Docker Compose + Caddy (автоматический HTTPS).

## Что внутри

- **Сегодня** — личный рабочий стол: просроченные и сегодняшние задачи, сделки без
  следующего шага.
- **Сделки** — канбан по стадиям с drag-and-drop, таблица с сортировкой, панель
  сделки с задачами, лентой активностей и дополнительными полями.
- **Контакты** — люди и компании, история взаимодействий, связанные сделки.
- **Админка** — стадии воронки, пользователи и роли, дополнительные поля, причины
  проигрыша, настройки организации, демо-данные.
- **Онбординг** — регистрация в два шага, чеклист запуска, осмысленные пустые
  состояния, кнопка «Заполнить демо-данными».
- Роли `owner` / `admin` / `member`, приглашения по ссылке, сброс пароля,
  светлая и тёмная тема, адаптивная вёрстка (сайдбар на десктопе, таб-бар на телефоне).

## Быстрый старт (Docker)

```bash
git clone <repo> sdelka && cd crm
cp .env.example .env          # поменяйте SECRET_KEY и POSTGRES_PASSWORD
docker compose up -d --build
open http://localhost:8080
```

Миграции применяются автоматически при старте контейнера `api`. Зарегистрируйте
организацию, затем в чеклисте на «Сегодня» нажмите «Заполнить демо-данными».

## Деплой на VPS

Весь стек в Docker Compose: Postgres, API и веб (Caddy отдаёт статику, проксирует
`/api` и сам выпускает сертификат Let's Encrypt).

1. DNS: A-записи `sdelka.app` и `www.sdelka.app` → IP сервера. Порты 80 и 443 открыты.
2. На сервере установите Docker с Compose plugin, склонируйте репозиторий:
   ```bash
   git clone git@github.com:kulichevskiy/sdelka.git && cd sdelka
   cp .env.example .env
   ```
3. В `.env` задайте:
   ```
   DOMAIN=sdelka.app
   APP_URL=https://sdelka.app
   HTTP_PORT=80
   HTTPS_PORT=443
   SECRET_KEY=<openssl rand -hex 32>
   POSTGRES_PASSWORD=<openssl rand -hex 16>
   ```
4. `docker compose up -d --build`. Миграции применяются при старте `api`, Caddy получит
   сертификат при первом запросе; `www` редиректится на `sdelka.app`.

Почта необязательна: без `SMTP_HOST` ссылки приглашений и сброса пароля админ
копирует прямо из интерфейса. С SMTP они дополнительно уходят письмом.

**CI/CD.** На каждый push в `main` GitHub Actions (`.github/workflows/deploy.yml`)
прогоняет pytest, ruff, tsc и сборку фронта, затем по SSH делает на сервере
`git reset --hard origin/main && docker compose up -d --build` и проверяет `/api/health`.
Секреты репозитория: `SSH_HOST`, `SSH_PRIVATE_KEY`, `SSH_KNOWN_HOSTS`. Сервер читает
репозиторий через deploy key (read-only), код лежит в `/opt/sdelka`.
Ручное обновление: `cd /opt/sdelka && git pull && docker compose up -d --build`.

**Бэкап БД** (поставьте в cron, каталог выгружайте в S3 или другое хранилище):
```bash
docker compose exec -T db pg_dump -U crm crm | gzip > /root/backups/sdelka-$(date +%F).sql.gz
# восстановление
gunzip -c sdelka-2026-09-10.sql.gz | docker compose exec -T db psql -U crm crm
```

Postgres наружу не публикуется, доступен только внутри сети Compose.

## Разработка

```bash
docker compose -f docker-compose.dev.yml up -d      # только Postgres на 5432

cd backend
uv sync
uv run alembic upgrade head
uv run uvicorn app.main:app --reload --port 8000    # http://localhost:8000/api/docs при DEBUG=true

cd ../frontend
npm install
npm run dev                                          # http://localhost:5173, /api → :8000
npm run gen:api                                      # типы из OpenAPI бэкенда
```

Фронтенд можно запускать и без бэкенда: `VITE_MOCK_API=true npm run dev` поднимает
in-memory реализацию контракта с демо-данными.

Тесты бэкенда: см. `backend/README.md`.

### Цветовая гамма

Палитры живут в `frontend/src/index.css` (`@theme`): `brand-*` — фирменный цвет,
`stone-*` — нейтраль. Подобрать новые оттенки помогает генератор:

```bash
cd frontend
npm run palette -- 3870D0                          # оттенки бренда и подсказки гармоний
npm run palette -- https://coolors.co/3870d0-ebebeb  # бренд + нейтраль из ссылки coolors
npm run palette -- 3870D0 EBEBEB --preview         # HTML-превью в scripts/palette-preview.html
npm run palette -- 3870D0 EBEBEB --apply           # записать шкалы в index.css
```

Генератор печатает ссылку на coolors.co с гармоничными акцентами, чтобы покрутить
их там, а `--apply` переписывает только блоки `--color-brand-*` и `--color-stone-*`.

## Архитектура

```
backend/            FastAPI
  app/core          конфиг, БД, сессии, зависимости (текущий пользователь, роли)
  app/models        SQLAlchemy-модели, org_id на каждой доменной таблице
  app/schemas       Pydantic-схемы, camelCase на проводе
  app/api           роутеры по доменам (/api/...)
  app/services      демо-данные, почта, токены
  alembic/          миграции
frontend/           React + Vite
  src/api           клиент, типы контракта, хуки TanStack Query
  src/sections      UI-компоненты разделов (props-based, из прототипа)
  src/pages         адаптеры: данные API → пропсы секций
  src/shell         оболочка: сайдбар, таб-бар, меню пользователя
  src/auth          лендинг, вход, регистрация, инвайт, сброс пароля
  src/onboarding    чеклист и пустые состояния
docs/api-contract.md  контракт API — единый источник правды для обеих частей
docs/demo-seed.json   демо-данные
```

**Изоляция тенантов.** Организация — тенант. Пользователь состоит ровно в одной.
`org_id` берётся из сессии, каждый запрос фильтруется по нему; составные внешние
ключи `(org_id, id)` не дают сделке одной организации сослаться на стадию другой.
Row-level security не используется намеренно: для учебного проекта прозрачнее
фильтр в коде и тесты на изоляцию.

**Сессии.** Opaque-токен в httpOnly cookie, в БД хранится sha256. Отключение
пользователя удаляет его сессии.

## Решения

- Одна валюта на организацию, а не на сделку: суммы в колонках должны складываться.
- Дополнительные поля хранятся в JSONB `custom_values` на сделке, контакте и
  компании; обязательность подсвечивается на фронтенде, бэкенд не блокирует
  создание «в один клик».
- Дата «сегодня» — локальная дата браузера. Таймзоны организации нет.
- Демо-данные помечаются `is_demo` и удаляются одной кнопкой; стадии, поля и
  причины проигрыша при этом остаются, потому что их могли уже настроить.
- Публичного демо-аккаунта нет: демо-данные заливаются в свою организацию за клик.
- Шрифт Graphik используется по лицензии владельца проекта.
