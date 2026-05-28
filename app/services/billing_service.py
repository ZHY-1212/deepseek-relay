from uuid import uuid4
from datetime import datetime, timezone
from fastapi import HTTPException

from app.models.user import User
from app.models.usage import UsageRecord


class BillingService:
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
            raise HTTPException(status_code=429, detail="Token 余额不足，请升级套餐")

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

    def deduct(self, user: User, tokens: int, model: str, user_store, usage_store):
        """Deduct tokens and record usage."""
        user.balance_tokens = max(0, user.balance_tokens - tokens)
        user.updated_at = datetime.now(timezone.utc).isoformat()
        user_store.update(user)

        record = UsageRecord(
            id=str(uuid4()),
            user_id=user.id,
            timestamp=datetime.now(timezone.utc).isoformat(),
            tokens_consumed=tokens,
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
