"""Pydantic models representing the API domain objects."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from uuid import uuid4

from pydantic import BaseModel, ConfigDict, Field, field_serializer, field_validator


def _utcnow() -> datetime:
    """Return a timezone aware UTC timestamp."""
    return datetime.now(timezone.utc)


def _ensure_datetime(value: Any) -> datetime:
    if isinstance(value, datetime):
        return value.astimezone(timezone.utc)
    if isinstance(value, str):
        try:
            if value.endswith("Z"):
                value = value[:-1] + "+00:00"
            return datetime.fromisoformat(value).astimezone(timezone.utc)
        except ValueError as exc:  # pragma: no cover - validation error bubble handled by caller
            raise ValueError(f"Invalid datetime value: {value!r}") from exc
    if value is None:
        return _utcnow()
    raise TypeError(f"Unsupported datetime value: {value!r}")


class TimestampedModel(BaseModel):
    """Mixin providing created/updated timestamps."""

    created_at: datetime = Field(default_factory=_utcnow, alias="createdAt")
    updated_at: datetime = Field(default_factory=_utcnow, alias="updatedAt")

    model_config = ConfigDict(populate_by_name=True, extra="allow", validate_assignment=True)

    @field_validator("created_at", "updated_at", mode="before")
    @classmethod
    def _parse_datetime(cls, value: Any) -> datetime:
        return _ensure_datetime(value)

    @field_serializer("created_at", "updated_at")
    def _serialize_datetime(self, value: datetime) -> str:
        return value.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")


class Asset(TimestampedModel):
    """Represents a creative asset tracked within a project."""

    id: str = Field(default_factory=lambda: str(uuid4()))
    name: str = Field(default="Untitled Asset")
    type: str = Field(default="primary")
    content: str = Field(default="")
    tags: List[str] = Field(default_factory=list)
    seed_id: Optional[str] = Field(default_factory=lambda: str(uuid4()), alias="seedId")
    summary: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)
    questions: List[Dict[str, Any]] = Field(default_factory=list)
    chat_context: List[Dict[str, Any]] = Field(default_factory=list, alias="chatContext")
    user_selections: Dict[str, Any] = Field(default_factory=dict, alias="userSelections")
    outputs: List[str] = Field(default_factory=list)
    is_master: Optional[bool] = Field(default=None, alias="isMaster")
    lineage: List[str] = Field(default_factory=list)
    shot_count: Optional[int] = Field(default=None, alias="shotCount")
    shot_type: Optional[str] = Field(default=None, alias="shotType")
    shot_details: Optional[Dict[str, Any]] = Field(default=None, alias="shotDetails")
    input_data: Optional[Dict[str, Any]] = Field(default=None, alias="inputData")
    individual_shots: List[Dict[str, Any]] = Field(default_factory=list, alias="individualShots")

    model_config = ConfigDict(populate_by_name=True, extra="allow")


def _default_primary_timeline() -> Dict[str, Any]:
    return {
        "folders": {
            "story": [],
            "image": [],
            "text_to_video": [],
        }
    }


class Project(TimestampedModel):
    """Aggregate root describing a creative workspace project."""

    id: str = Field(default_factory=lambda: str(uuid4()))
    name: str = Field(default="Untitled Project")
    description: Optional[str] = None
    target_model: Optional[str] = Field(default=None, alias="targetModel")
    assets: List[Asset] = Field(default_factory=list)
    primary_timeline: Dict[str, Any] = Field(default_factory=_default_primary_timeline, alias="primaryTimeline")
    secondary_timeline: Optional[Dict[str, Any]] = Field(default=None, alias="secondaryTimeline")
    third_timeline: Optional[Dict[str, Any]] = Field(default=None, alias="thirdTimeline")
    fourth_timeline: Optional[Dict[str, Any]] = Field(default=None, alias="fourthTimeline")
    tracks: Optional[List[Dict[str, Any]]] = None
    timeline_items: Optional[List[Dict[str, Any]]] = Field(default=None, alias="timelineItems")

    model_config = ConfigDict(populate_by_name=True, extra="allow")

