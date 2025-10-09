"""Project management API endpoints."""
from __future__ import annotations

from flask import Blueprint, jsonify, request

from src.api.errors import ValidationError
from src.services.projects import ProjectService


def _json_body() -> dict:
    body = request.get_json(silent=True)
    if body is None:
        raise ValidationError("Request body must be valid JSON.")
    if not isinstance(body, dict):
        raise ValidationError("JSON payload must be an object.")
    return body


def create_projects_blueprint(service: ProjectService) -> Blueprint:
    bp = Blueprint("projects", __name__, url_prefix="/api/projects")

    @bp.get("/")
    def list_projects() -> tuple:
        projects = service.list_projects()
        return jsonify({"projects": projects}), 200

    @bp.post("/")
    def create_project() -> tuple:
        payload = _json_body()
        project = service.create_project(payload)
        return jsonify(project), 201

    @bp.get("/<project_id>")
    def get_project(project_id: str) -> tuple:
        project = service.get_project(project_id)
        return jsonify(project), 200

    @bp.patch("/<project_id>")
    def update_project(project_id: str) -> tuple:
        payload = _json_body()
        project = service.update_project(project_id, payload)
        return jsonify(project), 200

    @bp.delete("/<project_id>")
    def delete_project(project_id: str) -> tuple:
        service.delete_project(project_id)
        return ("", 204)

    @bp.get("/<project_id>/assets")
    def list_assets(project_id: str) -> tuple:
        assets = service.list_assets(project_id)
        return jsonify({"assets": assets}), 200

    @bp.post("/<project_id>/assets")
    def create_asset(project_id: str) -> tuple:
        payload = _json_body()
        asset = service.add_asset(project_id, payload)
        return jsonify(asset), 201

    @bp.get("/<project_id>/assets/<asset_id>")
    def get_asset(project_id: str, asset_id: str) -> tuple:
        asset = service.get_asset(project_id, asset_id)
        return jsonify(asset), 200

    @bp.patch("/<project_id>/assets/<asset_id>")
    def update_asset(project_id: str, asset_id: str) -> tuple:
        payload = _json_body()
        asset = service.update_asset(project_id, asset_id, payload)
        return jsonify(asset), 200

    @bp.delete("/<project_id>/assets/<asset_id>")
    def delete_asset(project_id: str, asset_id: str) -> tuple:
        service.delete_asset(project_id, asset_id)
        return ("", 204)

    @bp.put("/<project_id>/timelines/<timeline_name>")
    def replace_timeline(project_id: str, timeline_name: str) -> tuple:
        payload = _json_body()
        timeline = service.replace_timeline(project_id, timeline_name, payload)
        return jsonify(timeline), 200

    @bp.post("/<project_id>/generate")
    def generate_outline(project_id: str) -> tuple:
        payload = _json_body()
        result = service.generate_outline(project_id, payload)
        return jsonify(result), 200

    return bp
