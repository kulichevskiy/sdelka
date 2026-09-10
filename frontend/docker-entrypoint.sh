#!/bin/sh
set -e
# Пустой DOMAIN — обычный HTTP на 80 порту (локально или за своим прокси).
# Заданный DOMAIN — Caddy сам выпустит и будет продлевать сертификат Let's Encrypt,
# а www.DOMAIN редиректится на DOMAIN.
if [ -z "$DOMAIN" ]; then
  export SITE_ADDRESS=":80"
  export WWW_REDIRECT=""
else
  export SITE_ADDRESS="$DOMAIN"
  export WWW_REDIRECT="www.$DOMAIN {
	redir https://$DOMAIN{uri} permanent
}"
fi
exec caddy run --config /etc/caddy/Caddyfile --adapter caddyfile
