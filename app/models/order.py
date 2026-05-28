from pydantic import BaseModel


class Order(BaseModel):
    id: str
    user_id: str
    username: str
    tier: str  # pro / vip
    amount: float  # ¥
    status: str = "pending"  # pending / paid / cancelled
    created_at: str = ""
    paid_at: str = ""
