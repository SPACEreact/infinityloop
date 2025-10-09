"""Domain models describing the core workspace entities."""
from __future__ import annotations

from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone
from typing import Any, Dict, Iterable, List, Mapping, MutableMapping


ISO_FORMAT = "%Y-%m-%dT%H:%M:%S.%fZ"


def _ensure_utc(dt: datetime | str | None) -> datetime:
    if dt is None:
        return datetime.utcnow()
    if isinstance(dt, datetime):
        if dt.tzinfo is not None:
            return dt.astimezone(timezone.utc).replace(tzinfo=None)
        return dt
    if isinstance(dt, str):
        try:
            return datetime.fromisoformat(dt.replace("Z", "+00:00")).replace(tzinfo=None)
        except ValueError as exc:
            raise ValueError(f"Invalid datetime string: {dt}") from exc
    raise TypeError("Unsupported datetime value")


def _to_iso(dt: datetime) -> str:
    return dt.strftime(ISO_FORMAT)


@dataclass
class Asset:
    """Represents a creative artefact tracked inside a project."""

    id: str
    name: str
    type: str
    content: str
    seed_id: str | None = None
    tags: List[str] = field(default_factory=list)
    summary: str | None = None
    metadata: Dict[str, Any] = field(default_factory=dict)
    questions: List[Mapping[str, Any]] = field(default_factory=list)
    chat_context: List[Mapping[str, Any]] = field(default_factory=list)
    user_selections: Dict[str, Any] = field(default_factory=dict)
    outputs: List[str] = field(default_factory=list)
    is_master: bool = False
    lineage: List[str] = field(default_factory=list)
    shot_count: int | None = None
    shot_type: str | None = None
    shot_details: Mapping[str, Any] | None = None
    input_data: Mapping[str, Any] | None = None
    individual_shots: List[Mapping[str, Any]] = field(default_factory=list)
    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: datetime = field(default_factory=datetime.utcnow)
    extra: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        payload = asdict(self)
        seed_id = payload.pop("seed_id")
        if seed_id is not None:
            payload["seedId"] = seed_id
        payload["createdAt"] = _to_iso(self.created_at)
        payload["updatedAt"] = _to_iso(self.updated_at)

        if self.shot_details is not None:
            payload["shotDetails"] = payload.pop("shot_details")
        else:
            payload.pop("shot_details", None)

        if self.input_data is not None:
            payload["inputData"] = payload.pop("input_data")
        else:
            payload.pop("input_data", None)

        individual_shots = payload.pop("individual_shots")
        if individual_shots:
            payload["individualShots"] = individual_shots
        payload["chatContext"] = payload.pop("chat_context")
        payload["userSelections"] = payload.pop("user_selections")
        is_master = payload.pop("is_master")
        if is_master:
            payload["isMaster"] = is_master
        shot_count = payload.pop("shot_count")
        if shot_count is not None:
            payload["shotCount"] = shot_count
        shot_type = payload.pop("shot_type")
        if shot_type is not None:
            payload["shotType"] = shot_type

        payload.update(payload.pop("extra", {}))
        return payload

    @classmethod
    def from_dict(cls, payload: Mapping[str, Any]) -> "Asset":
        raw: MutableMapping[str, Any] = dict(payload)
        seed_id = raw.pop("seedId", raw.pop("seed_id", None))
        created_at = _ensure_utc(raw.pop("createdAt", raw.pop("created_at", None)))
        updated_at = _ensure_utc(raw.pop("updatedAt", raw.pop("updated_at", None)))
        known_keys = {
            "id",
            "name",
            "type",
            "content",
            "tags",
            "summary",
            "metadata",
            "questions",
            "chat_context",
            "chatContext",
            "user_selections",
            "userSelections",
            "outputs",
            "is_master",
            "isMaster",
            "lineage",
            "shot_count",
            "shotCount",
            "shot_type",
            "shotType",
            "shot_details",
            "shotDetails",
            "input_data",
            "inputData",
            "individual_shots",
            "individualShots",
        }
        extra: Dict[str, Any] = {}
        for key in list(raw.keys()):
            if key not in known_keys:
                extra[key] = raw.pop(key)

        return cls(
            id=str(raw.get("id")),
            name=str(raw.get("name", "Untitled Asset")),
            type=str(raw.get("type", "primary")),
            content=str(raw.get("content", "")),
            seed_id=seed_id,
            tags=list(raw.get("tags", [])),
            summary=raw.get("summary"),
            metadata=dict(raw.get("metadata", {})),
            questions=list(raw.get("questions", [])),
            chat_context=list(raw.get("chat_context", raw.get("chatContext", []))),
            user_selections=dict(raw.get("user_selections", raw.get("userSelections", {}))),
            outputs=list(raw.get("outputs", [])),
            is_master=bool(raw.get("is_master", raw.get("isMaster", False))),
            lineage=list(raw.get("lineage", [])),
            shot_count=raw.get("shot_count", raw.get("shotCount")),
            shot_type=raw.get("shot_type", raw.get("shotType")),
            shot_details=raw.get("shot_details", raw.get("shotDetails")),
            input_data=raw.get("input_data", raw.get("inputData")),
            individual_shots=list(raw.get("individual_shots", raw.get("individualShots", []))),
            created_at=created_at,
            updated_at=updated_at,
            extra=extra,
        )


@dataclass
class Timeline:
    """Represents a timeline payload for a project."""

    primary: Mapping[str, Any]
    secondary: Mapping[str, Any] | None = None
    third: Mapping[str, Any] | None = None
    fourth: Mapping[str, Any] | None = None

    def to_dict(self) -> Dict[str, Any]:
        payload: Dict[str, Any] = {
            "primaryTimeline": self.primary,
        }
        if self.secondary is not None:
            payload["secondaryTimeline"] = self.secondary
        if self.third is not None:
            payload["thirdTimeline"] = self.third
        if self.fourth is not None:
            payload["fourthTimeline"] = self.fourth
        return payload

    @classmethod
    def from_dict(cls, payload: Mapping[str, Any]) -> "Timeline":
        return cls(
            primary=dict(payload.get("primaryTimeline", {})),
            secondary=payload.get("secondaryTimeline"),
            third=payload.get("thirdTimeline"),
            fourth=payload.get("fourthTimeline"),
        )


@dataclass
class Project:
    """Aggregate root representing a creative workspace project."""

    id: str
    name: str
    assets: List[Asset] = field(default_factory=list)
    timeline: Timeline = field(default_factory=lambda: Timeline(primary={"folders": {"story": [], "image": [], "text_to_video": []}}))
    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: datetime = field(default_factory=datetime.utcnow)
    description: str | None = None
    target_model: str | None = None
    settings: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "targetModel": self.target_model,
            "settings": self.settings,
            "assets": [asset.to_dict() for asset in self.assets],
            **self.timeline.to_dict(),
            "createdAt": _to_iso(self.created_at),
            "updatedAt": _to_iso(self.updated_at),
        }

    @classmethod
    def from_dict(cls, payload: Mapping[str, Any]) -> "Project":
        return cls(
            id=str(payload.get("id")),
            name=str(payload.get("name", "Untitled Project")),
            description=payload.get("description"),
            target_model=payload.get("targetModel"),
            settings=dict(payload.get("settings", {})),
            assets=[Asset.from_dict(item) for item in payload.get("assets", [])],
            timeline=Timeline.from_dict(payload),
            created_at=_ensure_utc(payload.get("createdAt", payload.get("created_at"))),
            updated_at=_ensure_utc(payload.get("updatedAt", payload.get("updated_at"))),
        )

    def replace_assets(self, assets: Iterable[Asset]) -> None:
        self.assets = list(assets)
        self.touch()

    def update_from_mapping(self, updates: Mapping[str, Any]) -> None:
        if "name" in updates:
            self.name = str(updates["name"]).strip() or self.name
        if "description" in updates:
            self.description = updates["description"]
        if "targetModel" in updates:
            self.target_model = updates["targetModel"]
        if "settings" in updates:
            merged = dict(self.settings)
            merged.update(dict(updates["settings"]))
            self.settings = merged
        if "primaryTimeline" in updates or "secondaryTimeline" in updates or "thirdTimeline" in updates or "fourthTimeline" in updates:
            incoming = Timeline.from_dict(updates)
            self.timeline = incoming
        self.touch()

    def touch(self) -> None:
        self.updated_at = datetime.utcnow()
