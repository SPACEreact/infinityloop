"""Knowledge base API endpoints."""
from __future__ import annotations

from flask import Blueprint, jsonify

from src.services.knowledge import KnowledgeService


def create_knowledge_blueprint(service: KnowledgeService) -> Blueprint:
    bp = Blueprint("knowledge", __name__, url_prefix="/api/knowledge")

    @bp.get("/")
    def get_knowledge() -> tuple:
        payload = service.load()
        return jsonify(payload), 200

    return bp
