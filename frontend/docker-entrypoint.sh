#!/bin/sh
set -e
# Пустой DOMAIN — обычный HTTP на 80 порту (локально или за своим прокси).
# Заданный DOMAIN — Caddy сам выпустит и будет продлевать сертификат Let's Encrypt.
if [ -z "$DOMAIN" ]; then
  export SITE_ADDRESS=":80"
else
  export SITE_ADDRESS="$DOMAIN"
fi
exec caddy run --config /etc/caddy/Caddyfile --adapter caddyfile
