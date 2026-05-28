from uuid import uuid4
from datetime import datetime, timezone
from typing import Optional

from app.store.json_store import JsonStore
from app.models.user import User


class UserStore:
    def __init__(self, store: JsonStore):
        self.store = store

    def _all(self) -> dict:
        return self.store.read_all()

    def _save(self, data: dict):
        self.store.write_all(data)

    def get_by_id(self, user_id: str) -> Optional[User]:
        data = self._all()
        if user_id in data:
            return User(**data[user_id])
        return None

    def get_by_email(self, email: str) -> Optional[User]:
        data = self._all()
        for u in data.values():
            if u["email"] == email:
                return User(**u)
        return None

    def get_by_username(self, username: str) -> Optional[User]:
        data = self._all()
        for u in data.values():
            if u["username"] == username:
                return User(**u)
        return None

    def get_by_api_key_hash(self, key_hash: str) -> Optional[User]:
        data = self._all()
        for u in data.values():
            if u["api_key_hash"] == key_hash:
                return User(**u)
        return None

    def create(self, user: User) -> User:
        def _do(data):
            data[user.id] = user.model_dump()
            return data
        self.store.atomic_update(_do)
        return user

    def update(self, user: User) -> User:
        def _do(data):
            data[user.id] = user.model_dump()
            return data
        self.store.atomic_update(_do)
        return user

    def list_all(self) -> list[User]:
        data = self._all()
        return [User(**u) for u in data.values()]

    def count(self) -> int:
        return len(self._all())
