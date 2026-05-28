from pydantic import BaseModel, EmailStr
from app.models.user import TierEnum


class RegisterRequest(BaseModel):
    username: str
    email: str
    password: str


class LoginRequest(BaseModel):
    account: str  # 用户名或邮箱
    password: str


class ChatRequest(BaseModel):
    model: str = "deepseek-chat"
    messages: list[dict]
    temperature: float = 0.7
    max_tokens: int = 4096
    stream: bool = False


class UpgradeRequest(BaseModel):
    tier: TierEnum


class ChangeTierRequest(BaseModel):
    tier: str
