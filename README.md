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

## Деплой на VPS через Coolify

Используется `docker-compose.coolify.yml`: Postgres, API и веб в одном стеке, а HTTPS,
домен и деплой из git берёт на себя Coolify. Секреты (`SERVICE_PASSWORD_*`) Coolify
генерирует сам при первом деплое.

1. Запушьте репозиторий на GitHub (или GitLab) и подключите его в Coolify
   (Sources → GitHub App или deploy key).
2. **New Resource → Docker Compose**, выберите репозиторий и ветку `main`,
   в поле *Docker Compose Location* укажите `/docker-compose.coolify.yml`.
3. После загрузки в карточке сервиса `web` задайте домен `https://sdelka.app`.
   Если нужен и `www`, перечислите через запятую: `https://sdelka.app,https://www.sdelka.app`.
4. В DNS направьте A-запись `sdelka.app` (и `www`) на IP сервера. На сервере должны
   быть открыты порты 80 и 443 для прокси Coolify.
5. **Deploy.** Миграции применяются при старте `api`, сертификат выпустит прокси Coolify.
6. Необязательно: в *Environment Variables* добавьте `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`,
   `SMTP_PASSWORD`, `SMTP_FROM`. Без SMTP ссылки приглашений и сброса пароля админ
   копирует прямо из интерфейса.

**Обновление:** push в `main` (включите *Auto Deploy* в настройках ресурса) или кнопка
*Redeploy*.

**Бэкап БД.** Встроенные бэкапы Coolify работают только для его собственных ресурсов
Postgres, а не для базы из compose, поэтому дамп снимаем командой. На сервере:

```bash
CID=$(docker ps -qf name=^db-)         # контейнер Postgres нашего стека
docker exec "$CID" pg_dump -U crm crm | gzip > /root/backups/sdelka-$(date +%F).sql.gz
# восстановление
gunzip -c sdelka-2026-09-10.sql.gz | docker exec -i "$CID" psql -U crm crm
```

Поставьте её в cron (`crontab -e`, например `0 3 * * *`) и выгружайте каталог
`/root/backups` в S3 или другое хранилище. Альтернатива: завести Postgres как отдельный
ресурс Coolify (там бэкапы в S3 по расписанию из коробки) и указать его адрес в
`DATABASE_URL`.

### Без Coolify (просто Docker на сервере)

Тот же стек, но HTTPS выдаёт Caddy внутри контейнера `web`. В `.env`:

```
DOMAIN=sdelka.app
APP_URL=https://sdelka.app
HTTP_PORT=80
HTTPS_PORT=443
SECRET_KEY=<длинная случайная строка>   # openssl rand -hex 32
POSTGRES_PASSWORD=<пароль>
```

Затем `docker compose up -d --build`; обновление `git pull && docker compose up -d --build`;
бэкап `docker compose exec db pg_dump -U crm crm | gzip > backup-$(date +%F).sql.gz`.

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
