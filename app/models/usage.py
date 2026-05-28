from pydantic import BaseModel


class UsageRecord(BaseModel):
    id: str
    user_id: str
    timestamp: str
    tokens_consumed: int
    model: str
    request_count: int = 1
    success: bool = True
    endpoint: str = "/v1/chat/completions"
