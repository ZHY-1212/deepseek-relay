from uuid import uuid4
from datetime import datetime, timezone
from fastapi import HTTPException

from app.models.user import User
from app.models.usage import UsageRecord

# Model markup rates (multiplier on API tokens to platform tokens)
# Platform tokens = API tokens * rate
MODEL_RATES = {
    # DeepSeek official - 3x markup
    "deepseek-chat": 3.0,
    "deepseek-reasoner": 4.0,
    # SiliconFlow models - 3x
    "deepseek-ai/DeepSeek-V3": 3.0,
    "deepseek-ai/DeepSeek-R1": 4.0,
    "Qwen/Qwen2.5-72B-Instruct": 3.5,
    "Qwen/Qwen2.5-7B-Instruct": 2.0,
    "zai-org/GLM-4.6": 3.0,
    "THUDM/glm-4-9b-chat": 2.0,
    # DashScope
    "qwen-plus": 3.5,
    "qwen-max": 4.0,
    # Zhipu
    "glm-4-plus": 3.0,
    "glm-4-flash": 2.0,
    # Volcengine
    "doubao-pro-256k": 3.0,
    "doubao-lite-128k": 2.0,
    # Moonshot
    "moonshot-v1-128k": 3.5,
    "moonshot-v1-8k": 3.0,
}

DEFAULT_RATE = 3.0


class BillingService:
    def get_rate(self, model: str) -> float:
        return MODEL_RATES.get(model, DEFAULT_RATE)

    def check_quota(self, user: User, tier_store, usage_store) -> None:
        """Raise HTTPException if user exceeded limits."""
        tier = tier_store.get(user.tier.value)
        if not tier:
            raise HTTPException(status_code=500, detail="套餐配置异常")

        requests_per_day = tier.get("requests_per_day")
        if requests_per_day is not None:
            today_count = usage_store.count_requests_today(user.id)
            if today_count >= requests_per_day:
                raise HTTPException(status_code=429, detail=f"今日请求次数已达上限（{requests_per_day}次），请明日再试")

        if user.balance_tokens <= 0:
            raise HTTPException(status_code=429, detail="余额不足，请前往充值页面充值")

    def check_and_replenish(self, user: User, tier_store, user_store) -> User:
        """Replenish tokens if it's a new month."""
        current_month = datetime.now(timezone.utc).strftime("%Y-%m")
        if user.last_replenished_month != current_month:
            tier = tier_store.get(user.tier.value)
            if tier:
                user.balance_tokens = tier["tokens_per_month"]
                user.last_replenished_month = current_month
                user_store.update(user)
        return user

    def deduct(self, user: User, tokens: int, tokens_in: int, tokens_out: int, model: str, user_store, usage_store):
        """Deduct platform tokens with model-specific markup."""
        rate = self.get_rate(model)
        cost = int(tokens * rate)  # platform tokens to deduct
        user.balance_tokens = max(0, user.balance_tokens - cost)
        user.updated_at = datetime.now(timezone.utc).isoformat()
        user_store.update(user)

        record = UsageRecord(
            id=str(uuid4()),
            user_id=user.id,
            timestamp=datetime.now(timezone.utc).isoformat(),
            tokens_consumed=tokens,
            tokens_deducted=cost,
            tokens_in=tokens_in,
            tokens_out=tokens_out,
            model=model,
            request_count=1,
            success=True,
            endpoint="/v1/chat/completions",
        )
        usage_store.add(record)

    def record_failed(self, user: User, model: str, usage_store):
        """Record a failed request attempt."""
        record = UsageRecord(
            id=str(uuid4()),
            user_id=user.id,
            timestamp=datetime.now(timezone.utc).isoformat(),
            tokens_consumed=0,
            model=model,
            request_count=1,
            success=False,
            endpoint="/v1/chat/completions",
        )
        usage_store.add(record)
