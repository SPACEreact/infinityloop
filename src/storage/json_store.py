"""Simple JSON backed storage used by the API services."""
from __future__ import annotations

import json
from pathlib import Path
from threading import RLock
from typing import Any, Dict


class JsonDataStore:
    """Persists arbitrary dictionaries to disk atomically."""

    def __init__(self, file_path: str | Path, *, default: Dict[str, Any] | None = None) -> None:
        self.path = Path(file_path)
        self.default = default or {}
        self._lock = RLock()
        self.path.parent.mkdir(parents=True, exist_ok=True)
        if not self.path.exists():
            self.write(self.default)

    def read(self) -> Dict[str, Any]:
        with self._lock:
            if not self.path.exists():
                return dict(self.default)
            with self.path.open("r", encoding="utf-8") as handle:
                return json.load(handle)

    def write(self, payload: Dict[str, Any]) -> None:
        with self._lock:
            temp_path = self.path.with_suffix(".tmp")
            with temp_path.open("w", encoding="utf-8") as handle:
                json.dump(payload, handle, indent=2, ensure_ascii=False)
            temp_path.replace(self.path)
