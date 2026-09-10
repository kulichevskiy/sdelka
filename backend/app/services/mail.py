"""Почта. Без SMTP_HOST письма не уходят: ссылки приглашений и сброса показывает админ
в интерфейсе, поэтому приложение полностью работоспособно и без почты."""

import logging
from email.message import EmailMessage

import aiosmtplib

from app.core.config import get_settings

log = logging.getLogger(__name__)


async def send_mail(to: str, subject: str, body: str) -> bool:
    settings = get_settings()
    if not settings.mail_enabled:
        log.info("SMTP не настроен, письмо «%s» для %s не отправлено", subject, to)
        return False
    message = EmailMessage()
    message["From"] = settings.smtp_from
    message["To"] = to
    message["Subject"] = subject
    message.set_content(body)
    try:
        await aiosmtplib.send(
            message,
            hostname=settings.smtp_host,
            port=settings.smtp_port,
            username=settings.smtp_user or None,
            password=settings.smtp_password or None,
            start_tls=settings.smtp_port == 587,
        )
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
