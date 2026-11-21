# Сделка — контракт API

Единый источник правды для бэкенда (`backend/`) и фронтенда (`frontend/`). Всё, что
здесь не описано, решается в пользу простоты и духа наброска `mocks/saas`.

## Общие правила

- Префикс `/api`. JSON, ключи **camelCase** (Pydantic `alias_generator=to_camel`,
  `populate_by_name=True`). Фронтенд использует те же имена, что и в наброске.
- Идентификаторы — UUID v4, на проводе строки.
- Даты-без-времени — строки `YYYY-MM-DD` (`dueDate`, `expectedCloseDate`, `date`,
  `createdAt` у сделки). Временные метки — ISO 8601 с таймзоной.
- Деньги — целые числа в минимальной единице не нужны: `amount` — число (numeric(14,2)),
  на проводе number.
- Аутентификация браузера — httpOnly cookie `session` (opaque token, 32+ байт, хранится хэш
  в таблице `sessions`, срок 30 дней, продлевается при активности). `SameSite=Lax`,
  `Secure` если `APP_URL` начинается с https.
- Аутентификация интеграций — личный API-токен в заголовке `Authorization: Bearer sdl_…`
  (см. «API-токены»). Токен действует от имени выпустившего пользователя, с его ролью и
  организацией, на все эндпоинты, кроме помеченных **[браузер]**. Если заголовок передан,
  cookie игнорируется: неверный токен → `401`, даже при живой сессии.
- Все доменные ресурсы принадлежат организации текущего пользователя. Клиент никогда
  не передаёт `orgId`. Доступ к чужому объекту → `404`.
- Все организации живут в общих таблицах; изоляцию обеспечивает RLS в PostgreSQL
  (политики по `org_id`, организация задаётся на каждую транзакцию), фильтры по `org_id`
  в коде остаются вторым рубежом.
- Ошибки: `{ "detail": "человекочитаемое сообщение на русском" }` и HTTP-код.
  Ошибки валидации Pydantic — стандартный формат FastAPI (`422`).
  `401` — нет сессии или токена, `403` — не хватает роли, `409` — конфликт (email занят и т.п.).
  У отдельных ошибок есть машинный код в заголовке `X-Error-Code`.
- Пометка **[браузер]** = только cookie-сессия; с API-токеном → `403`.
- Роли: `owner` > `admin` > `member`. Пометка **[admin]** ниже = owner или admin.
  Без пометки — любой активный участник.
- Пользователь со статусом `disabled` не может войти; активные сессии удаляются
  при отключении.

## Типы

```ts
type Role = 'owner' | 'admin' | 'member'
type UserStatus = 'active' | 'invited' | 'disabled'
type Currency = 'RUB' | 'USD' | 'EUR'
type DealOutcome = 'won' | 'lost'
type ActivityType = 'call' | 'email' | 'meeting' | 'note'
type FieldEntity = 'deal' | 'contact' | 'company'
type FieldType = 'text' | 'number' | 'date' | 'select'
type CustomValues = Record<string /* fieldId */, string | number | null>

interface Me {
  user: { id: string; name: string; email: string; role: Role }
  org: { id: string; name: string; currency: Currency; createdAt: string }
  onboarding: Onboarding
}

interface Onboarding {
  /** Скрыт ли чеклист текущим пользователем */
  dismissed: boolean
  items: Array<{ key: OnboardingKey; done: boolean }>
  /** Есть ли в организации демо-данные */
  hasDemoData: boolean
}
type OnboardingKey = 'deal' | 'contact' | 'invite' | 'pipeline' | 'task'
// deal — есть хотя бы одна сделка; contact — хотя бы один контакт;
// invite — в организации больше одного пользователя (любой статус);
// pipeline — стадии когда-либо меняли (флаг org.pipeline_customized);
// task — есть хотя бы одна задача.

interface VerificationPending { verificationRequired: true; email: string }
interface ApiToken { id; name; prefix: string /* первые 8 символов токена */; lastUsedAt: string | null; createdAt }

interface User { id; name; email; role: Role; status: UserStatus; createdAt }
interface Stage { id; name; order: number; isClosing: boolean }
interface Company { id; name; industry; website; phone; ownerId; note; customValues; createdAt }
interface Contact { id; name; position; companyId; email; phone; ownerId; customValues; createdAt }
interface Deal {
  id; title; companyId; contactId: string | null; ownerId; stageId
  amount: number; expectedCloseDate: string | null; createdAt: string /* YYYY-MM-DD */
  outcome: DealOutcome | null; lostReason: string | null; description: string
  customValues: CustomValues
}
interface Task { id; dealId; title; dueDate: string; isDone: boolean; assigneeId }
interface Activity {
  id; companyId; contactId: string | null; dealId: string | null
  type: ActivityType; authorId; date: string; note: string
}
interface CustomField { id; name; entity: FieldEntity; type: FieldType; isRequired: boolean; options: string[]; order: number }
interface LossReason { id; name; usageCount: number /* сделок с lostReason == name */ }
```

## Auth

| Метод | Путь | Тело / ответ |
|---|---|---|
| POST | `/api/auth/register` | `{ name, email, password, orgName, currency, pipelineTemplate: 'standard' \| 'empty' }` → `201 Me`, ставит cookie — если SMTP не настроен. Если настроен → `202 VerificationPending` без cookie: уходит письмо со ссылкой `${APP_URL}/verify/${token}`, войти можно только после подтверждения. Создаёт организацию, пользователя-owner. `standard` = стадии «Новая заявка, Квалификация, Предложение, Переговоры, Закрыто(isClosing)»; `empty` = только «Закрыто». Пароль ≥ 8 символов. Email занят → 409. |
| POST | `/api/auth/verify-email` | `{ token }` → `Me`, ставит cookie. Невалидный/использованный токен → 404. |
| POST | `/api/auth/resend-verification` | `{ email }` → `204` всегда. Письмо уходит, только если почта ждёт подтверждения, и не чаще раза в минуту; новая ссылка гасит прежнюю. |
| POST | `/api/auth/login` | `{ email, password }` → `Me`. Неверно → 401 «Неверная почта или пароль». Disabled → 403. Почта не подтверждена → 403 с `X-Error-Code: email_unverified`. |
| POST | `/api/auth/logout` | → 204, удаляет сессию и cookie |
| GET | `/api/auth/me` | → `Me` |
| PATCH | `/api/auth/me` | `{ name? }` → `Me` |
| POST | `/api/auth/change-password` **[браузер]** | `{ currentPassword, newPassword }` → 204. Если SMTP настроен — письмо-уведомление о смене пароля. |
| GET | `/api/auth/invite/{token}` | → `{ email, orgName, inviterName, role }`; невалидный/использованный → 404 |
| POST | `/api/auth/accept-invite` | `{ token, name, password }` → `Me`, ставит cookie; статус → `active`, почта считается подтверждённой |
| POST | `/api/auth/forgot-password` | `{ email }` → `204` всегда. Если SMTP настроен — письмо. Если нет — ничего (ссылку выдаёт админ через `/api/users/{id}/reset-link`). |
| GET | `/api/auth/reset/{token}` | → `{ email }` или 404 |
| POST | `/api/auth/reset-password` | `{ token, password }` → 204. Удаляет все сессии и API-токены пользователя, гасит ссылки подтверждения почты, шлёт письмо-уведомление. Сброс по ссылке из письма заодно подтверждает почту. |

Токены приглашения, сброса и подтверждения почты — случайные, в БД хранится sha256, срок:
приглашение 14 дней, сброс 2 часа, подтверждение 48 часов, одноразовые.

Пользователи, созданные до появления подтверждения почты, считаются подтверждёнными.

## API-токены

| Метод | Путь | |
|---|---|---|
| GET | `/api/auth/api-tokens` **[браузер]** | → `ApiToken[]` текущего пользователя, новые сверху |
| POST | `/api/auth/api-tokens` **[браузер]** | `{ name }` → `201 ApiToken & { token: string }`. Сам токен (`sdl_` + 43 символа) отдаётся только здесь, в БД хранится sha256. Не больше 20 на пользователя → 409. |
| DELETE | `/api/auth/api-tokens/{id}` **[браузер]** | → 204. Чужой или несуществующий → 404. |

Токены бессрочные, живут до отзыва. Все токены пользователя удаляются при сбросе пароля и
при отключении пользователя. `lastUsedAt` обновляется не чаще раза в 5 минут.
Пример: `curl -H "Authorization: Bearer sdl_…" https://sdelka.app/api/deals`.

## Организация и онбординг

| Метод | Путь | |
|---|---|---|
| GET | `/api/org` | → `Me['org']` |
| PATCH | `/api/org` **[admin]** | `{ name?, currency? }` |
| POST | `/api/org/onboarding/dismiss` | → `Onboarding` (флаг на пользователе) |
| POST | `/api/org/demo-data` **[admin]** | → 204. Заливает демо-данные из `docs/demo-seed.json` со сдвигом дат: `2026-08-29` → сегодня (UTC-дата сервера). Коллеги создаются как пользователи `invited` с уникальными email вида `<local>+demo@sdelka.app`, все `is_demo=true`. Сделки владельца «Анна Соколова» переписываются на текущего пользователя. Если демо уже есть → 409. |
| DELETE | `/api/org/demo-data` **[admin]** | → 204. Удаляет всё с `is_demo=true` (пользователей, компании, контакты, сделки, задачи, активности). Стадии, поля и причины проигрыша **не трогает** (они не демо). При заливке демо: если у организации только закрывающая стадия или стандартные стадии — демо-сделки раскладываются по существующим стадиям по порядку (первые 4 открытых + закрывающая); если открытых стадий меньше 4 — сделки ложатся на имеющиеся по кругу. Кастомные поля и причины проигрыша из seed добавляются только если у организации таких ещё нет по имени, и **не** помечаются demo. |

## Пользователи организации

| Метод | Путь | |
|---|---|---|
| GET | `/api/users` | → `User[]` (все статусы) |
| POST | `/api/users/invite` **[admin]** **[браузер]** | `{ email, role: 'admin' \| 'member' }` → `{ user: User, inviteUrl: string \| null }`. `inviteUrl` = `${APP_URL}/invite/${token}`, возвращается всегда (админ может скопировать), письмо отправляется, если есть SMTP. Email уже в организации → 409. |
| POST | `/api/users/{id}/resend-invite` **[admin]** **[браузер]** | → `{ inviteUrl }`, новый токен, старый гасится. Только для `invited`. |
| POST | `/api/users/{id}/reset-link` **[admin]** **[браузер]** | → `{ resetUrl }`. Только для `active`. |
| PATCH | `/api/users/{id}` **[admin]** **[браузер]** | `{ role?: 'admin' \| 'member', status?: 'active' \| 'disabled' }`. Нельзя: менять owner'a; менять себя; admin не может менять другого admin (только owner может). Нарушение → 403. |
| POST | `/api/users/{id}/transfer-ownership` **[owner]** **[браузер]** | → 204. Целевой должен быть `active`. Бывший owner становится admin. |
| DELETE | `/api/users/{id}` **[admin]** **[браузер]** | → 204. Только для `invited` (отмена приглашения). |

## Стадии

| Метод | Путь | |
|---|---|---|
| GET | `/api/stages` | → `Stage[]` по `order` |
| POST | `/api/stages` **[admin]** | `{ name }` → `Stage`, вставляется перед закрывающей |
| PATCH | `/api/stages/{id}` **[admin]** | `{ name }` |
| PUT | `/api/stages/order` **[admin]** | `{ ids: string[] }` — полный список; закрывающая принудительно последняя |
| DELETE | `/api/stages/{id}` **[admin]** | `?moveTo=<stageId>` обязателен, если на стадии есть сделки (иначе 409). Закрывающую удалить нельзя (409). |

Любая мутация стадий ставит `org.pipeline_customized = true`.

## Компании, контакты

| Метод | Путь | |
|---|---|---|
| GET | `/api/companies` | → `Company[]` |
| POST | `/api/companies` | `{ name, industry?, website?, phone?, ownerId?, note?, customValues? }` → `Company` |
| PATCH | `/api/companies/{id}` | любое подмножество полей |
| DELETE | `/api/companies/{id}` **[admin]** | 409, если есть сделки или контакты |
| GET | `/api/contacts` | → `Contact[]` |
| POST | `/api/contacts` | `{ name, companyId, position?, email?, phone?, ownerId?, customValues? }` |
| PATCH | `/api/contacts/{id}` | |
| DELETE | `/api/contacts/{id}` **[admin]** | у сделок с этим контактом `contactId` → null |

## Сделки

| Метод | Путь | |
|---|---|---|
| GET | `/api/deals` | → `Deal[]` |
| GET | `/api/deals/export.csv` | → CSV всех сделок текущей организации (включая открытые, `won`, `lost`), без фильтров и пагинации. Любой активный участник, как для списка; без сессии/при отключённом доступе → 401. |
| POST | `/api/deals` | `{ title, companyId, contactId?, amount?, ownerId?, expectedCloseDate?, description?, customValues? }` → `Deal`; стадия — первая незакрывающая (если её нет — закрывающая) |
| PATCH | `/api/deals/{id}` | `{ title?, companyId?, contactId?, ownerId?, amount?, expectedCloseDate?, description?, customValues? }` |
| POST | `/api/deals/{id}/move` | `{ stageId, outcome?, lostReason? }`. На закрывающую стадию `outcome` обязателен (422), `lostReason` обязателен при `lost`. Уход с закрывающей → `outcome`/`lostReason` обнуляются. |
| DELETE | `/api/deals/{id}` **[admin]** | каскадно задачи; у активностей `dealId` → null |

### CSV сделок

- `200`, `Content-Type: text/csv; charset=utf-8`, `Content-Disposition: attachment; filename="deals.csv"`, `Cache-Control: no-store`. Клиент получает `Blob`, не JSON, и скачивает файл только после полного успешного ответа; ошибки не скачиваются.
- UTF-8 с BOM для кириллицы в Excel; разделитель — запятая, строки — CRLF. Кавычки, запятые и переносы внутри ячеек экранируются стандартным CSV. Пустая выборка содержит заголовки; `null` — пустая ячейка.
- Порядок колонок: `ID`, `Название`, `Компания`, `Контакт`, `Ответственный`, `Стадия`, `Сумма`, `Валюта`, `Дата создания`, `Ожидаемая дата закрытия`, `Исход`, `Причина проигрыша`, `Описание`, затем по одной колонке на действующее дополнительное поле сделки своей организации (порядок `order`, затем `id`; заголовок — имя поля, одинаковые имена остаются отдельными колонками).
- Связи — названия из своей организации, включая отключённых ответственных; отсутствующая связь — пустая ячейка. Значения удалённых/неизвестных/чужих полей и полей других сущностей не экспортируются. Одна запись CSV на сделку, порядок `created_at DESC, id`.
- Сумма — десятичное число с точкой без округления через float; валюта — валюта организации; даты — `YYYY-MM-DD` (создание — бизнес-дата `createdAt`), исход — пусто / `won` / `lost`.
- Защита от формул: к строковой ячейке, начинающейся с `=`, `+`, `-`, `@` (в том числе после пробелов/BOM/табуляции/переносов), либо с TAB/CR/LF, добавляется начальный апостроф. Применяется также к названиям связей и заголовкам дополнительных полей. Числовые значения остаются числами. Это намеренное изменение потенциально опасного текста для открытия в таблицах; при повторном сохранении сторонним редактором его правила могут отличаться.
- Экспорт выполняет свежий запрос независимо от кэша/фильтров UI. Сервер буферизует CSV целиком перед ответом: ошибка чтения/сериализации не выдаёт частичный файл за полный. Размер не ограничен и не обрезается; память сервера и браузера пропорциональна размеру экспорта. Это не исторический снимок: параллельные изменения справочников и сделок подчиняются текущей изоляции транзакций БД.

Обязательные кастомные поля бэкенд **не** валидирует жёстко (сделки создаются в один клик из наброска), фронтенд подсвечивает незаполненные обязательные поля в панели.

## Задачи, активности

| Метод | Путь | |
|---|---|---|
| GET | `/api/tasks` | → `Task[]` |
| POST | `/api/tasks` | `{ dealId, title, dueDate, assigneeId? }` (по умолчанию текущий) |
| PATCH | `/api/tasks/{id}` | `{ title?, dueDate?, isDone?, assigneeId? }` |
| DELETE | `/api/tasks/{id}` | |
| GET | `/api/activities` | → `Activity[]` |
| POST | `/api/activities` | `{ companyId, contactId?, dealId?, type, note, date? }` (дата по умолчанию сегодня, автор — текущий) |
| DELETE | `/api/activities/{id}` | автор или admin |

## Настройки

| Метод | Путь | |
|---|---|---|
| GET | `/api/custom-fields` | → `CustomField[]` |
| POST | `/api/custom-fields` **[admin]** | `{ name, entity, type, isRequired, options? }` |
| PATCH | `/api/custom-fields/{id}` **[admin]** | `{ name?, isRequired?, options? }` |
| DELETE | `/api/custom-fields/{id}` **[admin]** | значения в `customValues` остаются мусором, фронтенд их игнорирует |
| GET | `/api/loss-reasons` | → `LossReason[]` |
| POST | `/api/loss-reasons` **[admin]** | `{ name }` |
| PATCH | `/api/loss-reasons/{id}` **[admin]** | `{ name }` — у сделок `lostReason` со старым именем переписывается на новое |
| DELETE | `/api/loss-reasons/{id}` **[admin]** | |

## Служебное

- `GET /api/health` → `{ status: 'ok' }` (без авторизации).
- `GET /api/openapi.json`, `/api/docs` — стандартные FastAPI, доступны всегда: это
  документация публичного API (в Swagger токен вводится через «Authorize»).

## Переменные окружения (backend)

```
DATABASE_URL=postgresql+asyncpg://crm:crm@db:5432/crm
SECRET_KEY=...            # для подписи ничего не нужно, но используется как соль cookie-имени/CSRF при желании
APP_URL=http://localhost:8080   # для ссылок в письмах и инвайтах
DEBUG=false
POSTBOX_KEY_ID= POSTBOX_SECRET_KEY=   # Yandex Cloud Postbox по HTTPS (в проде: SMTP на хостинге закрыт)
SMTP_HOST= SMTP_PORT=587 SMTP_USER= SMTP_PASSWORD=   # любой SMTP: 587 — STARTTLS, 465 — TLS
SMTP_FROM=   # отправитель для обоих вариантов; нет ни ключей Postbox, ни SMTP_HOST = почта отключена
# Пользователь БД из DATABASE_URL — владелец схемы; миграции создают роль sdelka_app
# (нужен CREATEROLE или SUPERUSER), на неё приложение переключается в каждой транзакции.
```
