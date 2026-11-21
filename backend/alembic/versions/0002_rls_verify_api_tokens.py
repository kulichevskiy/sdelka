"""RLS, подтверждение почты, API-токены

Revision ID: 0002
Revises: 0001
Create Date: 2026-11-21

Изоляция тенантов переезжает в базу. Миграция создаёт роль sdelka_app без права входа:
приложение подключается прежним пользователем (владельцем схемы) и на время каждой
транзакции переключается на эту роль, поэтому политики действуют, даже если владелец —
суперпользователь. Пользователю миграций нужны права CREATEROLE или SUPERUSER.
"""

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None

APP_ROLE = "sdelka_app"

# Таблицы с собственным org_id.
ORG_TABLES = (
    "users",
    "stages",
    "companies",
    "contacts",
    "deals",
    "tasks",
    "activities",
    "custom_fields",
    "loss_reasons",
)
# Таблицы, принадлежащие пользователю: видны, если виден сам пользователь.
USER_TABLES = ("sessions", "tokens", "api_tokens")
ALL_TABLES = ("organizations", *ORG_TABLES, *USER_TABLES)


def upgrade() -> None:
    op.add_column("users", sa.Column("email_verified_at", sa.DateTime(timezone=True)))
    # Все, кто уже задал пароль, зарегистрировались до появления проверки: считаем
    # их почту подтверждённой, иначе они не смогут войти.
    op.execute("UPDATE users SET email_verified_at = now() WHERE password_hash IS NOT NULL")

    op.create_table(
        "api_tokens",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("token_hash", sa.String(64), nullable=False, unique=True),
        sa.Column("prefix", sa.String(16), nullable=False),
        sa.Column("last_used_at", sa.DateTime(timezone=True)),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
    )
    op.create_index("ix_api_tokens_user_id", "api_tokens", ["user_id"])

    # Роли общие на весь кластер: в соседней базе она уже могла быть создана.
    op.execute(
        f"""
        DO $$
        BEGIN
            IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '{APP_ROLE}') THEN
                CREATE ROLE {APP_ROLE} NOLOGIN;
            END IF;
        END
        $$
        """
    )
    # Чтобы обычный (не супер) владелец схемы мог выполнить SET ROLE.
    op.execute(f"GRANT {APP_ROLE} TO CURRENT_USER")
    op.execute(f"GRANT USAGE ON SCHEMA public TO {APP_ROLE}")

    # Организация текущей транзакции. Пустая строка — настройка сброшена после SET LOCAL.
    op.execute(
        """
        CREATE FUNCTION current_org_id() RETURNS uuid
        LANGUAGE sql STABLE
        AS $$ SELECT nullif(current_setting('app.org_id', true), '')::uuid $$
        """
    )

    for table in ALL_TABLES:
        op.execute(f"GRANT SELECT, INSERT, UPDATE, DELETE ON {table} TO {APP_ROLE}")
        op.execute(f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY")
    op.execute(
        "CREATE POLICY tenant_isolation ON organizations "
        "USING (id = current_org_id()) WITH CHECK (id = current_org_id())"
    )
    for table in ORG_TABLES:
        op.execute(
            f"CREATE POLICY tenant_isolation ON {table} "
            "USING (org_id = current_org_id()) WITH CHECK (org_id = current_org_id())"
        )
    for table in USER_TABLES:
        # Подзапрос к users сам проходит через RLS, поэтому чужие пользователи не видны.
        op.execute(
            f"CREATE POLICY tenant_isolation ON {table} "
            "USING (user_id IN (SELECT id FROM users)) "
            "WITH CHECK (user_id IN (SELECT id FROM users))"
        )


def downgrade() -> None:
    for table in ALL_TABLES:
        op.execute(f"DROP POLICY tenant_isolation ON {table}")
        op.execute(f"ALTER TABLE {table} DISABLE ROW LEVEL SECURITY")
        op.execute(f"REVOKE ALL ON {table} FROM {APP_ROLE}")
    op.execute("DROP FUNCTION current_org_id()")
    # Саму роль не удаляем: она общая на кластер и может использоваться соседней базой.
    op.execute(f"REVOKE USAGE ON SCHEMA public FROM {APP_ROLE}")
    op.drop_index("ix_api_tokens_user_id", table_name="api_tokens")
    op.drop_table("api_tokens")
    op.drop_column("users", "email_verified_at")
