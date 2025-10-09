"""Business logic for manipulating projects and assets."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Dict, List
from uuid import uuid4

from .api.errors import ConflictError, NotFoundError, ValidationError
from .models import Asset, Project
from .schemas import (
    AssetCreate,
    AssetUpdate,
    GenerationRequest,
    GenerationResult,
    ProjectCreate,
    ProjectUpdate,
)
from .store import ProjectStore


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class ProjectService:
    """High level operations for working with projects."""

    def __init__(self, store: ProjectStore) -> None:
        self._store = store
        self._projects: Dict[str, Project] = self._store.load()

    # ------------------------------------------------------------------
    # Persistence helpers
    def _save(self) -> None:
        self._store.save(self._projects.values())

    def _get_project(self, project_id: str) -> Project:
        try:
            return self._projects[project_id]
        except KeyError as exc:
            raise NotFoundError(f"Project '{project_id}' was not found.") from exc

    # ------------------------------------------------------------------
    # Project operations
    def list_projects(self) -> List[Dict]:
        projects = sorted(
            self._projects.values(),
            key=lambda project: project.updated_at,
            reverse=True,
        )
        return [project.model_dump(by_alias=True, mode="json") for project in projects]

    def create_project(self, payload: Dict) -> Dict:
        data = ProjectCreate.model_validate(payload or {})
        project_data = data.model_dump(exclude_unset=True, by_alias=True)
        project_id = project_data.get("id") or payload.get("id") or str(uuid4())

        if project_id in self._projects:
            raise ConflictError(f"Project '{project_id}' already exists.")

        project = Project.model_validate({"id": project_id, **project_data})
        project = project.model_copy(update={"created_at": _utcnow(), "updated_at": _utcnow()}, deep=True)

        self._projects[project.id] = project
        self._save()
        return project.model_dump(by_alias=True, mode="json")

    def get_project(self, project_id: str) -> Dict:
        project = self._get_project(project_id)
        return project.model_dump(by_alias=True, mode="json")

    def update_project(self, project_id: str, payload: Dict) -> Dict:
        if not payload:
            raise ValidationError("Update payload cannot be empty.")

        project = self._get_project(project_id)
        data = ProjectUpdate.model_validate(payload)
        updates = data.model_dump(exclude_unset=True, by_alias=False)
        if data.assets is not None:
            updates["assets"] = data.assets

        updated = project.model_copy(update={**updates, "updated_at": _utcnow()}, deep=True)
        self._projects[project_id] = updated
        self._save()
        return updated.model_dump(by_alias=True, mode="json")

    def delete_project(self, project_id: str) -> None:
        if project_id not in self._projects:
            raise NotFoundError(f"Project '{project_id}' was not found.")
        del self._projects[project_id]
        self._save()

    # ------------------------------------------------------------------
    # Asset operations
    def list_assets(self, project_id: str) -> List[Dict]:
        project = self._get_project(project_id)
        return [asset.model_dump(by_alias=True, mode="json") for asset in project.assets]

    def add_asset(self, project_id: str, payload: Dict) -> Dict:
        project = self._get_project(project_id)
        data = AssetCreate.model_validate(payload or {})
        asset_data = data.model_dump(exclude_unset=True, by_alias=True)
        asset_id = asset_data.get("id") or payload.get("id") or str(uuid4())

        if any(asset.id == asset_id for asset in project.assets):
            raise ConflictError(f"Asset '{asset_id}' already exists in project '{project_id}'.")

        asset = Asset.model_validate({"id": asset_id, **asset_data})
        asset = asset.model_copy(update={"created_at": _utcnow(), "updated_at": _utcnow()}, deep=True)

        project.assets.append(asset)
        project.updated_at = _utcnow()
        self._save()
        return asset.model_dump(by_alias=True, mode="json")

    def get_asset(self, project_id: str, asset_id: str) -> Dict:
        project = self._get_project(project_id)
        for asset in project.assets:
            if asset.id == asset_id:
                return asset.model_dump(by_alias=True, mode="json")
        raise NotFoundError(f"Asset '{asset_id}' was not found in project '{project_id}'.")

    def update_asset(self, project_id: str, asset_id: str, payload: Dict) -> Dict:
        if not payload:
            raise ValidationError("Update payload cannot be empty.")

        project = self._get_project(project_id)
        schema = AssetUpdate.model_validate(payload)
        updates = schema.model_dump(exclude_unset=True, by_alias=False)

        for index, asset in enumerate(project.assets):
            if asset.id == asset_id:
                updated = asset.model_copy(update={**updates, "updated_at": _utcnow()}, deep=True)
                project.assets[index] = updated
                project.updated_at = _utcnow()
                self._save()
                return updated.model_dump(by_alias=True, mode="json")
        raise NotFoundError(f"Asset '{asset_id}' was not found in project '{project_id}'.")

    def delete_asset(self, project_id: str, asset_id: str) -> None:
        project = self._get_project(project_id)
        filtered = [asset for asset in project.assets if asset.id != asset_id]
        if len(filtered) == len(project.assets):
            raise NotFoundError(f"Asset '{asset_id}' was not found in project '{project_id}'.")
        project.assets = filtered
        project.updated_at = _utcnow()
        self._save()

    # ------------------------------------------------------------------
    # Timelines & generation
    def replace_timeline(self, project_id: str, timeline_name: str, payload: Dict) -> Dict:
        project = self._get_project(project_id)
        if not isinstance(payload, dict):
            raise ValidationError("Timeline payload must be an object.")
        key = f"{timeline_name}_timeline" if not timeline_name.endswith("Timeline") else timeline_name

        attribute_map = {
            "primary": "primary_timeline",
            "secondary": "secondary_timeline",
            "third": "third_timeline",
            "fourth": "fourth_timeline",
            "primaryTimeline": "primary_timeline",
            "secondaryTimeline": "secondary_timeline",
            "thirdTimeline": "third_timeline",
            "fourthTimeline": "fourth_timeline",
            "primary_timeline": "primary_timeline",
            "secondary_timeline": "secondary_timeline",
            "third_timeline": "third_timeline",
            "fourth_timeline": "fourth_timeline",
        }
        attr = attribute_map.get(timeline_name, attribute_map.get(key, None))
        if attr is None:
            raise ValidationError(f"Unsupported timeline '{timeline_name}'.")

        setattr(project, attr, payload)
        project.updated_at = _utcnow()
        self._save()
        timeline = getattr(project, attr)
        return timeline

    def generate_outline(self, project_id: str, payload: Dict) -> Dict:
        project = self._get_project(project_id)
        request = GenerationRequest.model_validate(payload or {})
        prompt_preview = (request.prompt or "").strip()
        message = (
            "Generation request accepted." if prompt_preview else "Generation request queued with default settings."
        )
        if prompt_preview:
            primary = project.primary_timeline or {}
            primary["lastPrompt"] = prompt_preview
            project.primary_timeline = primary
        if request.mode:
            primary = project.primary_timeline or {}
            primary["lastMode"] = request.mode
            project.primary_timeline = primary

        result = GenerationResult(
            status="queued",
            project=project,
            message=message,
            parameters=request.parameters,
        )
        project.updated_at = _utcnow()
        self._save()
        return result.model_dump(by_alias=True, mode="json")

