"""Repository for persisting and retrieving project aggregates."""
from __future__ import annotations

import uuid
from pathlib import Path
from typing import Dict, Iterable, List, Optional

from src.domain.models import Project
from src.storage.json_store import JsonDataStore


class ProjectRepository:
    """Handles persistence of projects and their child assets."""

    def __init__(self, *, data_file: str | Path | None = None) -> None:
        default_file = Path("data/projects.json")
        self.store = JsonDataStore(data_file or default_file, default={"projects": []})

    def list_projects(self) -> List[Project]:
        raw_projects = self.store.read().get("projects", [])
        return [Project.from_dict(item) for item in raw_projects]

    def get_project(self, project_id: str) -> Optional[Project]:
        for project in self.list_projects():
            if project.id == project_id:
                return project
        return None

    def save(self, project: Project) -> Project:
        payload = self.store.read()
        projects: List[Dict] = payload.get("projects", [])
        for index, existing in enumerate(projects):
            if existing.get("id") == project.id:
                projects[index] = project.to_dict()
                break
        else:
            projects.append(project.to_dict())
        payload["projects"] = projects
        self.store.write(payload)
        return project

    def delete(self, project_id: str) -> None:
        payload = self.store.read()
        projects: List[Dict] = payload.get("projects", [])
        updated = [item for item in projects if item.get("id") != project_id]
        payload["projects"] = updated
        self.store.write(payload)

    def next_id(self) -> str:
        return str(uuid.uuid4())

    def replace_all(self, projects: Iterable[Project]) -> None:
        self.store.write({"projects": [project.to_dict() for project in projects]})
