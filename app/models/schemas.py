from pydantic import BaseModel, EmailStr
from app.models.user import TierEnum


class RegisterRequest(BaseModel):
    username: str
    email: str
    password: str


class LoginRequest(BaseModel):
    email: str
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
