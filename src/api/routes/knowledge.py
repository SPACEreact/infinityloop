"""Knowledge base API endpoints."""
from __future__ import annotations

from flask import Blueprint, jsonify, request

from ...knowledge_service import KnowledgeService
from ..errors import ValidationError


def create_knowledge_blueprint(service: KnowledgeService) -> Blueprint:
    bp = Blueprint("knowledge", __name__, url_prefix="/api/knowledge")

    @bp.get("/")
    def get_knowledge() -> tuple:
        payload = service.all()
        return jsonify(payload), 200

    @bp.get("/search")
    def search_knowledge() -> tuple:
        query = request.args.get("q", "").strip()
        if not query:
            raise ValidationError("Query parameter 'q' is required.")
        results = service.search(query)
        return jsonify(results), 200

    return bp

