"""Service layer that encapsulates project orchestration logic."""
from __future__ import annotations

from copy import deepcopy
from datetime import datetime
from typing import Any, Dict, Iterable, List, Mapping, MutableMapping

from src.api.errors import ConflictError, NotFoundError, ValidationError
from src.domain.models import Asset, Project, Timeline
from src.repositories.project_repository import ProjectRepository


PRIMARY_TIMELINE_SKELETON: Dict[str, Any] = {
    "folders": {
        "story": [],
        "image": [],
        "text_to_video": [],
    }
}


class ProjectService:
    """High level orchestration for workspace projects."""

    def __init__(self, repository: ProjectRepository) -> None:
        self.repository = repository

    def list_projects(self) -> List[Dict[str, Any]]:
        return [project.to_dict() for project in self.repository.list_projects()]

    def get_project(self, project_id: str) -> Dict[str, Any]:
        project = self.repository.get_project(project_id)
        if not project:
            raise NotFoundError(f"Project '{project_id}' does not exist.")
        return project.to_dict()

    def create_project(self, payload: Mapping[str, Any]) -> Dict[str, Any]:
        name = str(payload.get("name") or "Untitled Project").strip()
        description = payload.get("description")
        target_model = payload.get("targetModel")
        settings = dict(payload.get("settings", {}))

        project_id = payload.get("id") or self.repository.next_id()
        now = datetime.utcnow()
        project = Project(
            id=str(project_id),
            name=name,
            description=description,
            target_model=target_model,
            settings=settings,
            timeline=Timeline(primary=deepcopy(PRIMARY_TIMELINE_SKELETON)),
            created_at=now,
            updated_at=now,
        )

        assets_payload = payload.get("assets")
        if assets_payload:
            project.replace_assets(self._parse_assets(assets_payload))

        project.timeline = self._parse_timelines(payload, project.timeline)

        self.repository.save(project)
        return project.to_dict()

    def update_project(self, project_id: str, payload: Mapping[str, Any]) -> Dict[str, Any]:
        project = self.repository.get_project(project_id)
        if not project:
            raise NotFoundError(f"Project '{project_id}' does not exist.")

        if "assets" in payload:
            project.replace_assets(self._parse_assets(payload["assets"]))

        project.update_from_mapping(payload)
        project.touch()
        self.repository.save(project)
        return project.to_dict()

    def delete_project(self, project_id: str) -> None:
        project = self.repository.get_project(project_id)
        if not project:
            raise NotFoundError(f"Project '{project_id}' does not exist.")
        self.repository.delete(project_id)

    def list_assets(self, project_id: str) -> List[Dict[str, Any]]:
        project = self.repository.get_project(project_id)
        if not project:
            raise NotFoundError(f"Project '{project_id}' does not exist.")
        return [asset.to_dict() for asset in project.assets]

    def get_asset(self, project_id: str, asset_id: str) -> Dict[str, Any]:
        project = self.repository.get_project(project_id)
        if not project:
            raise NotFoundError(f"Project '{project_id}' does not exist.")
        for asset in project.assets:
            if asset.id == asset_id:
                return asset.to_dict()
        raise NotFoundError(f"Asset '{asset_id}' was not found on project '{project_id}'.")

    def add_asset(self, project_id: str, payload: Mapping[str, Any]) -> Dict[str, Any]:
        project = self.repository.get_project(project_id)
        if not project:
            raise NotFoundError(f"Project '{project_id}' does not exist.")

        asset_id = str(payload.get("id") or self.repository.next_id())
        if any(asset.id == asset_id for asset in project.assets):
            raise ConflictError(f"Asset '{asset_id}' already exists on the project.")

        asset = self._build_asset(asset_id, payload)
        project.assets.append(asset)
        project.touch()
        self.repository.save(project)
        return asset.to_dict()

    def update_asset(self, project_id: str, asset_id: str, payload: Mapping[str, Any]) -> Dict[str, Any]:
        project = self.repository.get_project(project_id)
        if not project:
            raise NotFoundError(f"Project '{project_id}' does not exist.")

        for index, asset in enumerate(project.assets):
            if asset.id == asset_id:
                updated_payload = asset.to_dict()
                updated_payload.update(payload)
                updated_asset = Asset.from_dict(updated_payload)
                updated_asset.updated_at = datetime.utcnow()
                project.assets[index] = updated_asset
                project.touch()
                self.repository.save(project)
                return updated_asset.to_dict()

        raise NotFoundError(f"Asset '{asset_id}' was not found on project '{project_id}'.")

    def delete_asset(self, project_id: str, asset_id: str) -> None:
        project = self.repository.get_project(project_id)
        if not project:
            raise NotFoundError(f"Project '{project_id}' does not exist.")

        filtered = [asset for asset in project.assets if asset.id != asset_id]
        if len(filtered) == len(project.assets):
            raise NotFoundError(f"Asset '{asset_id}' was not found on project '{project_id}'.")

        project.replace_assets(filtered)
        project.touch()
        self.repository.save(project)

    def replace_timeline(self, project_id: str, timeline_name: str, payload: Mapping[str, Any]) -> Dict[str, Any]:
        project = self.repository.get_project(project_id)
        if not project:
            raise NotFoundError(f"Project '{project_id}' does not exist.")

        normalized = dict(project.timeline.to_dict())
        key = self._timeline_key(timeline_name)
        normalized[key] = payload
        project.timeline = Timeline.from_dict(normalized)
        project.touch()
        self.repository.save(project)
        return project.timeline.to_dict()

    def generate_outline(self, project_id: str, instructions: Mapping[str, Any]) -> Dict[str, Any]:
        project = self.repository.get_project(project_id)
        if not project:
            raise NotFoundError(f"Project '{project_id}' does not exist.")

        summary = instructions.get("summary") or ""
        notes = instructions.get("notes") or ""
        response = {
            "projectId": project_id,
            "generatedAt": datetime.utcnow().isoformat() + "Z",
            "summary": summary.strip() or f"Creative direction for {project.name}",
            "notes": notes,
            "assetCount": len(project.assets),
        }
        return response

    def _parse_assets(self, assets: Iterable[Mapping[str, Any]]) -> List[Asset]:
        parsed: List[Asset] = []
        for item in assets:
            asset_id = item.get("id")
            if not asset_id:
                raise ValidationError("Each asset requires an 'id' field.")
            parsed.append(self._build_asset(str(asset_id), item))
        return parsed

    def _build_asset(self, asset_id: str, payload: Mapping[str, Any]) -> Asset:
        normalized: MutableMapping[str, Any] = dict(payload)
        normalized["id"] = asset_id
        normalized.setdefault("name", "Untitled Asset")
        normalized.setdefault("type", "primary")
        normalized.setdefault("content", "")
        normalized.setdefault("tags", [])
        normalized.setdefault("metadata", {})
        normalized.setdefault("createdAt", datetime.utcnow().isoformat() + "Z")
        normalized.setdefault("updatedAt", datetime.utcnow().isoformat() + "Z")
        return Asset.from_dict(normalized)

    def _parse_timelines(self, payload: Mapping[str, Any], current: Timeline) -> Timeline:
        if any(key in payload for key in ("primaryTimeline", "secondaryTimeline", "thirdTimeline", "fourthTimeline")):
            return Timeline.from_dict(payload)
        return current

    @staticmethod
    def _timeline_key(name: str) -> str:
        mapping = {
            "primary": "primaryTimeline",
            "secondary": "secondaryTimeline",
            "third": "thirdTimeline",
            "fourth": "fourthTimeline",
        }
        if name not in mapping:
            raise ValidationError(f"Unknown timeline '{name}'.")
        return mapping[name]
