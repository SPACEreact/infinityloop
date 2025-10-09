"""Utility for serving a lightweight knowledge base."""
from __future__ import annotations

import json
from pathlib import Path
from typing import Dict, List


class KnowledgeService:
    def __init__(self, path: str | Path = "data/knowledge_base.json") -> None:
        self.path = Path(path)
        self.path.parent.mkdir(parents=True, exist_ok=True)
        if not self.path.exists():
            self.path.write_text(json.dumps({"categories": []}, indent=2), encoding="utf-8")
        self._cache: Dict | None = None

    def _load(self) -> Dict:
        payload = json.loads(self.path.read_text(encoding="utf-8"))
        if "categories" not in payload or not isinstance(payload["categories"], list):
            payload["categories"] = []
        return payload

    def all(self) -> Dict:
        if self._cache is None:
            self._cache = self._load()
        return self._cache

    def search(self, query: str) -> Dict[str, List[Dict]]:
        query_lower = query.lower()
        results: List[Dict] = []
        for category in self.all().get("categories", []):
            for entry in category.get("entries", []):
                if query_lower in entry.get("question", "").lower() or query_lower in entry.get("answer", "").lower():
                    enriched = dict(entry)
                    enriched["categoryId"] = category.get("id")
                    enriched["categoryTitle"] = category.get("title")
                    results.append(enriched)
        return {"query": query, "results": results}

