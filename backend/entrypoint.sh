#!/bin/sh
set -e
# Миграции при каждом старте: контейнер сам приводит схему к нужной версии.
alembic upgrade head
exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --proxy-headers --forwarded-allow-ips='*'
