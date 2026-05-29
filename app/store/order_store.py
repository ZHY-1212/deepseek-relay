from app.store.json_store import JsonStore
from app.models.order import Order


class OrderStore:
    def __init__(self, store: JsonStore):
        self.store = store
        self._ensure_list()

    def _ensure_list(self):
        data = self.store.read_all()
        if not isinstance(data, list):
            self.store.write_all([])

    def _all(self) -> list[Order]:
        data = self.store.read_all()
        if not isinstance(data, list):
            self._ensure_list()
            return []
        return [Order(**r) for r in data]

    def add(self, order: Order):
        def _do(data):
            data.append(order.model_dump())
            return data
        self.store.atomic_update(_do)

    def get_by_id(self, order_id: str) -> Order | None:
        for r in self._all():
            if r.id == order_id:
                return r
        return None

    def update(self, order: Order):
        def _do(data):
            for i, r in enumerate(data):
                if r["id"] == order.id:
                    data[i] = order.model_dump()
                    break
            return data
        self.store.atomic_update(_do)

    def get_by_user(self, user_id: str) -> list[Order]:
        orders = [r for r in self._all() if r.user_id == user_id]
        orders.sort(key=lambda o: o.created_at, reverse=True)
        return orders

    def get_pending(self) -> list[Order]:
        orders = [r for r in self._all() if r.status == "pending"]
        orders.sort(key=lambda o: o.created_at, reverse=True)
        return orders

    def list_all(self) -> list[Order]:
        orders = self._all()
        orders.sort(key=lambda o: o.created_at, reverse=True)
        return orders
