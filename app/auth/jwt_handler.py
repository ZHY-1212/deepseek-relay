import jwt
from datetime import datetime, timedelta, timezone
from app.config import settings

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE = timedelta(hours=24)


def create_access_token(user_id: str, is_admin: bool = False) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": user_id,
        "admin": is_admin,
        "iat": now,
        "exp": now + ACCESS_TOKEN_EXPIRE,
    }
    return jwt.encode(payload, settings.secret_key, algorithm=ALGORITHM)


def verify_access_token(token: str) -> dict | None:
    try:
        return jwt.decode(token, settings.secret_key, algorithms=[ALGORITHM])
    except jwt.PyJWTError:
        return None
