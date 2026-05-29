from app.store.json_store import JsonStore


class SettingsStore:
    """Key-value store for platform settings (QR codes, etc)."""

    def __init__(self, store: JsonStore):
        self.store = store
        if not self.store.read_all():
            self.store.write_all({})

    def get(self, key: str, default=None):
        data = self.store.read_all()
        return data.get(key, default)

    def set(self, key: str, value):
        def _do(data):
            data[key] = value
            return data
        self.store.atomic_update(_do)

    def get_all(self) -> dict:
        return self.store.read_all()
