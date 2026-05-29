from pydantic import BaseModel


class UsageRecord(BaseModel):
    id: str
    user_id: str
    timestamp: str
    tokens_consumed: int = 0
    tokens_deducted: int = 0  # platform tokens charged to user
    tokens_in: int = 0
    tokens_out: int = 0
    model: str = ""
    request_count: int = 1
    success: bool = True
    endpoint: str = "/v1/chat/completions"
