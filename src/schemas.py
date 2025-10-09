"""Request/response schemas used by the Flask routes."""
from __future__ import annotations

from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict, Field

from .models import Asset, Project


class BaseSchema(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="allow")


class ProjectCreate(BaseSchema):
    id: Optional[str] = None
    name: Optional[str] = None
    description: Optional[str] = None
    target_model: Optional[str] = Field(default=None, alias="targetModel")
    assets: Optional[List[Asset]] = None
    primary_timeline: Optional[Dict[str, Any]] = Field(default=None, alias="primaryTimeline")
    secondary_timeline: Optional[Dict[str, Any]] = Field(default=None, alias="secondaryTimeline")
    third_timeline: Optional[Dict[str, Any]] = Field(default=None, alias="thirdTimeline")
    fourth_timeline: Optional[Dict[str, Any]] = Field(default=None, alias="fourthTimeline")


class ProjectUpdate(ProjectCreate):
    pass


class AssetCreate(BaseSchema):
    name: Optional[str] = None
    type: Optional[str] = None
    content: Optional[str] = None
    tags: Optional[List[str]] = None
    seed_id: Optional[str] = Field(default=None, alias="seedId")
    summary: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None
    questions: Optional[List[Dict[str, Any]]] = None
    chat_context: Optional[List[Dict[str, Any]]] = Field(default=None, alias="chatContext")
    user_selections: Optional[Dict[str, Any]] = Field(default=None, alias="userSelections")
    outputs: Optional[List[str]] = None
    is_master: Optional[bool] = Field(default=None, alias="isMaster")
    lineage: Optional[List[str]] = None
    shot_count: Optional[int] = Field(default=None, alias="shotCount")
    shot_type: Optional[str] = Field(default=None, alias="shotType")
    shot_details: Optional[Dict[str, Any]] = Field(default=None, alias="shotDetails")
    input_data: Optional[Dict[str, Any]] = Field(default=None, alias="inputData")
    individual_shots: Optional[List[Dict[str, Any]]] = Field(default=None, alias="individualShots")


class AssetUpdate(AssetCreate):
    pass


class TimelineUpdate(BaseSchema):
    data: Dict[str, Any]


class GenerationRequest(BaseSchema):
    prompt: Optional[str] = None
    mode: Optional[str] = None
    parameters: Dict[str, Any] = Field(default_factory=dict)


class GenerationResult(BaseSchema):
    status: str
    project: Project
    message: Optional[str] = None
    parameters: Dict[str, Any] = Field(default_factory=dict)

