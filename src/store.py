"""File-backed project store used by the service layer."""
from __future__ import annotations

import json
from pathlib import Path
from threading import RLock
from typing import Dict, Iterable, List

from .models import Project


class ProjectStore:
    """Lightweight JSON store for persisting projects to disk."""

    def __init__(self, path: str | Path = "data/projects.json") -> None:
        self.path = Path(path)
        self._lock = RLock()
        self.path.parent.mkdir(parents=True, exist_ok=True)
        if not self.path.exists():
            self.path.write_text(json.dumps({"projects": []}, indent=2), encoding="utf-8")

    def load(self) -> Dict[str, Project]:
        with self._lock:
            raw = json.loads(self.path.read_text(encoding="utf-8"))
            projects: List[Project] = [Project.model_validate(obj) for obj in raw.get("projects", [])]
            return {project.id: project for project in projects}

    def save(self, projects: Iterable[Project]) -> None:
        with self._lock:
            payload = {
                "projects": [project.model_dump(by_alias=True, mode="json") for project in projects]
            }
            self.path.write_text(json.dumps(payload, indent=2), encoding="utf-8")

