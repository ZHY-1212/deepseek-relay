from uuid import uuid4
from datetime import datetime, timezone
from collections import defaultdict

from app.store.json_store import JsonStore
from app.models.usage import UsageRecord


class UsageStore:
    def __init__(self, store: JsonStore):
        self.store = store

    def _all(self) -> list:
        return self.store.read_all()

    def _save(self, data: list):
        self.store.write_all(data)

    def add(self, record: UsageRecord):
        def _do(data):
            data.append(record.model_dump())
            return data
        self.store.atomic_update(_do)

    def get_by_user(self, user_id: str, limit: int = 100) -> list[UsageRecord]:
        data = self._all()
        records = [UsageRecord(**r) for r in data if r["user_id"] == user_id]
        records.sort(key=lambda r: r.timestamp, reverse=True)
        return records[:limit]

    def count_requests_today(self, user_id: str) -> int:
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        data = self._all()
        count = 0
        for r in data:
            if r["user_id"] == user_id and r["success"] and r["timestamp"].startswith(today):
                count += 1
        return count

    def get_user_stats(self, user_id: str) -> dict:
        data = self._all()
        total_tokens = 0
        total_requests = 0
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")

        daily_tokens = defaultdict(int)
        daily_requests = defaultdict(int)

        for r in data:
            if r["user_id"] == user_id and r["success"]:
                total_tokens += r["tokens_consumed"]
                total_requests += 1
                day = r["timestamp"][:10]
                daily_tokens[day] += r["tokens_consumed"]
                daily_requests[day] += 1

        today_tokens = daily_tokens.get(today, 0)
        today_requests = daily_requests.get(today, 0)

        last_7_days = []
        for i in range(6, -1, -1):
            from datetime import timedelta
            d = (datetime.now(timezone.utc) - timedelta(days=i)).strftime("%Y-%m-%d")
            last_7_days.append({
                "date": d,
                "tokens": daily_tokens.get(d, 0),
                "requests": daily_requests.get(d, 0),
            })

        return {
            "total_tokens": total_tokens,
            "total_requests": total_requests,
            "today_tokens": today_tokens,
            "today_requests": today_requests,
            "last_7_days": last_7_days,
        }

    def get_platform_stats(self) -> dict:
        data = self._all()
        total_tokens = sum(r["tokens_consumed"] for r in data if r["success"])
        total_requests = sum(1 for r in data if r["success"])
        unique_users = len(set(r["user_id"] for r in data))
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        today_tokens = sum(r["tokens_consumed"] for r in data if r["success"] and r["timestamp"].startswith(today))
        today_requests = sum(1 for r in data if r["success"] and r["timestamp"].startswith(today))
        return {
            "total_tokens": total_tokens,
            "total_requests": total_requests,
            "unique_users": unique_users,
            "today_tokens": today_tokens,
            "today_requests": today_requests,
        }
