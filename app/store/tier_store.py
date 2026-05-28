from app.store.json_store import JsonStore

TIER_DEFAULTS = {
    "free": {
        "name": "Free",
        "tokens_per_month": 100_000,
        "requests_per_day": 50,
        "price": 0,
    },
    "pro": {
        "name": "Pro",
        "tokens_per_month": 2_000_000,
        "requests_per_day": 500,
        "price": 19.9,
    },
    "vip": {
        "name": "VIP",
        "tokens_per_month": 10_000_000,
        "requests_per_day": None,
        "price": 49.9,
    },
}


class TierStore:
    def __init__(self, store: JsonStore):
        self.store = store
        self._ensure_defaults()

    def _ensure_defaults(self):
        data = self.store.read_all()
        if not data:
            self.store.write_all(TIER_DEFAULTS)

    def get(self, tier_name: str) -> dict | None:
        data = self.store.read_all()
        return data.get(tier_name)

    def list_all(self) -> dict:
        return self.store.read_all()

    def update(self, tier_name: str, updates: dict):
        def _do(data):
            if tier_name in data:
                data[tier_name].update(updates)
            return data
        self.store.atomic_update(_do)

    def get_tokens_per_month(self, tier_name: str) -> int:
        tier = self.get(tier_name)
        return tier["tokens_per_month"] if tier else 0

    def get_requests_per_day(self, tier_name: str) -> int | None:
        tier = self.get(tier_name)
        return tier["requests_per_day"] if tier else None
