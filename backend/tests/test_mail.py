import json
from datetime import UTC, datetime

import httpx

from app.core.config import get_settings
from app.services import mail


def test_signing_key_matches_aws_reference_vector():
    # Пример из документации AWS Signature V4.
    key = mail.signing_key(
        "wJalrXUtnFEMI/K7MDENG+bPxRfiCYEXAMPLEKEY", "20120215", "us-east-1", "iam"
    )
    assert key.hex() == "f4780e2d9f65fa895f9c67b32ce1baf0b0d8a43505a000a1a9e090d414db404d"


def test_signature_is_deterministic_and_covers_body(monkeypatch):
    settings = get_settings()
    monkeypatch.setattr(settings, "postbox_key_id", "key-id")
    monkeypatch.setattr(settings, "postbox_secret_key", "secret")
    now = datetime(2026, 11, 21, 10, 0, 0, tzinfo=UTC)
    first = mail.sign_request(settings, "postbox.cloud.yandex.net", b"{}", now)
    assert first == mail.sign_request(settings, "postbox.cloud.yandex.net", b"{}", now)
    assert first["x-amz-date"] == "20261121T100000Z"
    assert first["authorization"].startswith(
        "AWS4-HMAC-SHA256 Credential=key-id/20261121/ru-central1/ses/aws4_request, "
        "SignedHeaders=content-type;host;x-amz-date, Signature="
    )
    other = mail.sign_request(settings, "postbox.cloud.yandex.net", b'{"a":1}', now)
    assert other["authorization"] != first["authorization"]


async def test_postbox_keys_send_over_https_instead_of_smtp(monkeypatch):
    settings = get_settings()
    monkeypatch.setattr(settings, "postbox_key_id", "key-id")
    monkeypatch.setattr(settings, "postbox_secret_key", "secret")
    monkeypatch.setattr(settings, "smtp_host", "smtp.blocked")
    monkeypatch.setattr(settings, "smtp_from", "Сделка <noreply@sdelka.app>")
    seen: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        seen.append(request)
        return httpx.Response(200, json={"MessageId": "1"})

    monkeypatch.setattr(mail, "_http_transport", httpx.MockTransport(handler))
    assert await mail.send_mail("anna@example.com", "Тема", "Текст") is True

    (request,) = seen
    assert str(request.url) == "https://postbox.cloud.yandex.net/v2/email/outbound-emails"
    assert request.headers["authorization"].startswith("AWS4-HMAC-SHA256 Credential=key-id/")
    payload = json.loads(request.content)
    assert payload["Destination"] == {"ToAddresses": ["anna@example.com"]}
    assert payload["Content"]["Simple"]["Subject"]["Data"] == "Тема"
    assert payload["Content"]["Simple"]["Body"]["Text"]["Data"] == "Текст"
    # Кириллица в имени отправителя закодирована, адрес остался как есть.
    assert payload["FromEmailAddress"].endswith("<noreply@sdelka.app>")
    assert payload["FromEmailAddress"].isascii()


async def test_postbox_error_does_not_break_request(monkeypatch):
    settings = get_settings()
    monkeypatch.setattr(settings, "postbox_key_id", "key-id")
    monkeypatch.setattr(settings, "postbox_secret_key", "secret")
    transport = httpx.MockTransport(
        lambda request: httpx.Response(400, json={"Code": "MessageRejected", "message": "x"})
    )
    monkeypatch.setattr(mail, "_http_transport", transport)
    assert await mail.send_mail("anna@example.com", "Тема", "Текст") is False


async def test_mail_disabled_without_settings():
    assert get_settings().mail_enabled is False
    assert await mail.send_mail("anna@example.com", "Тема", "Текст") is False
