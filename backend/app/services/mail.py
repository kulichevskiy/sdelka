"""Почта: Yandex Cloud Postbox по HTTPS или любой SMTP. Без настроек письма не уходят:
ссылки приглашений и сброса показывает админ в интерфейсе, а почта при регистрации
считается подтверждённой сразу, поэтому приложение полностью работоспособно и без почты."""

import hashlib
import hmac
import json
import logging
from datetime import UTC, datetime
from email.message import EmailMessage
from email.utils import formataddr, parseaddr
from urllib.parse import urlsplit

import aiosmtplib
import httpx

from app.core.config import Settings, get_settings

log = logging.getLogger(__name__)

# Postbox совместим с Amazon SES v2: тот же путь и подпись AWS Signature V4.
POSTBOX_PATH = "/v2/email/outbound-emails"
POSTBOX_REGION = "ru-central1"
POSTBOX_SERVICE = "ses"
# Тесты подставляют сюда httpx.MockTransport.
_http_transport: httpx.AsyncBaseTransport | None = None


def _hmac(key: bytes, message: str) -> bytes:
    return hmac.new(key, message.encode(), hashlib.sha256).digest()


def signing_key(secret_key: str, date: str, region: str, service: str) -> bytes:
    key = _hmac(f"AWS4{secret_key}".encode(), date)
    for part in (region, service, "aws4_request"):
        key = _hmac(key, part)
    return key


def sign_request(settings: Settings, host: str, body: bytes, now: datetime) -> dict[str, str]:
    """Заголовки запроса к Postbox с подписью AWS Signature V4."""
    amz_date = now.strftime("%Y%m%dT%H%M%SZ")
    date = amz_date[:8]
    headers = {"content-type": "application/json", "host": host, "x-amz-date": amz_date}
    signed = ";".join(headers)
    canonical = "\n".join(
        [
            "POST",
            POSTBOX_PATH,
            "",
            "".join(f"{name}:{value}\n" for name, value in headers.items()),
            signed,
            hashlib.sha256(body).hexdigest(),
        ]
    )
    scope = f"{date}/{POSTBOX_REGION}/{POSTBOX_SERVICE}/aws4_request"
    to_sign = "\n".join(
        ["AWS4-HMAC-SHA256", amz_date, scope, hashlib.sha256(canonical.encode()).hexdigest()]
    )
    key = signing_key(settings.postbox_secret_key, date, POSTBOX_REGION, POSTBOX_SERVICE)
    signature = hmac.new(key, to_sign.encode(), hashlib.sha256).hexdigest()
    headers["authorization"] = (
        f"AWS4-HMAC-SHA256 Credential={settings.postbox_key_id}/{scope}, "
        f"SignedHeaders={signed}, Signature={signature}"
    )
    return headers


async def _send_postbox(settings: Settings, to: str, subject: str, body: str) -> None:
    # Имя отправителя с кириллицей кодируем по RFC 2047, как того требует SES API.
    name, address = parseaddr(settings.smtp_from)
    payload = json.dumps(
        {
            "FromEmailAddress": formataddr((name, address)) if name else address,
            "Destination": {"ToAddresses": [to]},
            "Content": {
                "Simple": {
                    "Subject": {"Data": subject, "Charset": "UTF-8"},
                    "Body": {"Text": {"Data": body, "Charset": "UTF-8"}},
                }
            },
        }
    ).encode()
    endpoint = settings.postbox_endpoint.rstrip("/")
    headers = sign_request(settings, urlsplit(endpoint).netloc, payload, datetime.now(UTC))
    async with httpx.AsyncClient(transport=_http_transport, timeout=15) as client:
        response = await client.post(endpoint + POSTBOX_PATH, content=payload, headers=headers)
    if response.status_code != 200:
        raise RuntimeError(f"Postbox ответил {response.status_code}: {response.text[:500]}")


async def _send_smtp(settings: Settings, to: str, subject: str, body: str) -> None:
    message = EmailMessage()
    message["From"] = settings.smtp_from
    message["To"] = to
    message["Subject"] = subject
    message.set_content(body)
    await aiosmtplib.send(
        message,
        hostname=settings.smtp_host,
        port=settings.smtp_port,
        username=settings.smtp_user or None,
        password=settings.smtp_password or None,
        # 465 — TLS с первого байта, 587 — STARTTLS, остальные порты — без шифрования.
        use_tls=settings.smtp_port == 465,
        start_tls=settings.smtp_port == 587,
    )


async def send_mail(to: str, subject: str, body: str) -> bool:
    settings = get_settings()
    if not settings.mail_enabled:
        log.info("Почта не настроена, письмо «%s» для %s не отправлено", subject, to)
        return False
    # Ключи Postbox главнее SMTP: HTTPS работает и там, где почтовые порты закрыты.
    send = _send_postbox if settings.postbox_enabled else _send_smtp
    try:
        await send(settings, to, subject, body)
        return True
    except Exception:  # noqa: BLE001 — сбой почты не должен ломать запрос
        log.exception("Не удалось отправить письмо для %s", to)
        return False


async def send_invite(to: str, org_name: str, inviter: str, url: str) -> bool:
    return await send_mail(
        to,
        f"Приглашение в {org_name} — Сделка",
        f"{inviter} приглашает вас в организацию «{org_name}» в Сделка.\n\n"
        f"Чтобы принять приглашение и задать пароль, откройте ссылку:\n{url}\n\n"
        "Ссылка действует 14 дней.",
    )


async def send_reset(to: str, url: str) -> bool:
    return await send_mail(
        to,
        "Сброс пароля — Сделка",
        f"Чтобы задать новый пароль, откройте ссылку:\n{url}\n\n"
        "Ссылка действует 2 часа. Если вы не запрашивали сброс, просто проигнорируйте письмо.",
    )


async def send_verify(to: str, name: str, url: str) -> bool:
    return await send_mail(
        to,
        "Подтвердите почту — Сделка",
        f"{name}, здравствуйте!\n\n"
        f"Чтобы закончить регистрацию в Сделка, подтвердите почту по ссылке:\n{url}\n\n"
        "Ссылка действует 48 часов. Если вы не регистрировались, просто проигнорируйте письмо.",
    )


async def send_password_changed(to: str) -> bool:
    return await send_mail(
        to,
        "Пароль изменён — Сделка",
        "Пароль от вашего аккаунта в Сделка только что изменили.\n\n"
        "Если это были не вы, сбросьте пароль на странице входа и напишите администратору "
        "вашей организации.",
    )
