from enum import Enum
from pydantic import BaseModel, Field


class TierEnum(str, Enum):
    FREE = "free"
    PRO = "pro"
    VIP = "vip"


class User(BaseModel):
    id: str
    username: str
    email: str
    hashed_password: str
    api_key_hash: str = ""
    api_key_prefix: str = ""
    tier: TierEnum = TierEnum.FREE
    balance_tokens: int = 0
    model_balances: dict = {}  # {"deepseek-chat": 50000, "qwen-plus": 30000, ...}
    is_admin: bool = False
    is_banned: bool = False
    last_replenished_month: str = ""
    created_at: str = ""
    updated_at: str = ""


class UserPublic(BaseModel):
    id: str
    username: str
    email: str
    api_key_prefix: str
    tier: TierEnum
    balance_tokens: int
    is_admin: bool
    is_banned: bool
    created_at: str
