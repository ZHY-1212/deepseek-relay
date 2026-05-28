import json
import threading
from pathlib import Path
from typing import Any


class JsonStore:
    """Thread-safe atomic JSON file store."""

    def __init__(self, filepath: str):
        self.filepath = Path(filepath)
        self._lock = threading.Lock()
        self._ensure_file()

    def _ensure_file(self):
        self.filepath.parent.mkdir(parents=True, exist_ok=True)
        if not self.filepath.exists():
            default = [] if "usage" in self.filepath.name else {}
            self._write_atomic(default)

    def _read(self) -> Any:
        with open(self.filepath, "r", encoding="utf-8") as f:
            return json.load(f)

    def _write_atomic(self, data: Any):
        tmp = self.filepath.with_suffix(".tmp")
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        tmp.replace(self.filepath)

    def read_all(self) -> Any:
        with self._lock:
            return self._read()

    def write_all(self, data: Any):
        with self._lock:
            self._write_atomic(data)

    def atomic_update(self, updater):
        """Atomically read-modify-write. updater(data) -> modified_data."""
        with self._lock:
            data = self._read()
            modified = updater(data)
            self._write_atomic(modified)
            return modified
