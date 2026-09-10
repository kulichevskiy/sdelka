FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 UV_COMPILE_BYTECODE=1 UV_LINK_MODE=copy
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

WORKDIR /app
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project

COPY app ./app
COPY alembic ./alembic
COPY alembic.ini entrypoint.sh ./
RUN chmod +x entrypoint.sh && useradd --create-home --uid 1000 app && chown -R app:app /app
USER app

ENV PATH="/app/.venv/bin:$PATH"
EXPOSE 8000
CMD ["./entrypoint.sh"]
