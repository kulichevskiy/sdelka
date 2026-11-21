import hashlib
import secrets

from pwdlib import PasswordHash

_hasher = PasswordHash.recommended()


def hash_password(password: str) -> str:
    return _hasher.hash(password)


def verify_password(password: str, password_hash: str | None) -> bool:
    if not password_hash:
        return False
    return _hasher.verify(password, password_hash)


def new_token() -> str:
    return secrets.token_urlsafe(32)


def hash_token(token: str) -> str:
    # В БД лежит только хэш: утечка таблицы не даёт готовых сессий и ссылок.
    return hashlib.sha256(token.encode()).hexdigest()


API_TOKEN_PREFIX = "sdl_"


def new_api_token() -> str:
    # Префикс отличает токен от прочих секретов в логах и сканерах утечек.
    return API_TOKEN_PREFIX + secrets.token_urlsafe(32)
