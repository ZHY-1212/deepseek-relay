import secrets
import hashlib

KEY_PREFIX = "sk-relay-"


def generate_api_key() -> tuple[str, str, str]:
    raw = KEY_PREFIX + secrets.token_hex(24)
    key_hash = hash_key(raw)
    key_prefix = raw[:12] + "..." + "****"
    return raw, key_hash, key_prefix


def hash_key(raw_key: str) -> str:
    return hashlib.sha256(raw_key.encode()).hexdigest()
