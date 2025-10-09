"""Application factory wiring together the API services."""
from __future__ import annotations

from flask import Flask, jsonify

from src.api.errors import ApiError, ErrorDetail, NotFoundError
from src.api.routes.knowledge import create_knowledge_blueprint
from src.api.routes.projects import create_projects_blueprint
from src.api.routes.status import create_status_blueprint
from src.knowledge_service import KnowledgeService
from src.logger import setup_logger
from src.project_service import ProjectService
from src.store import ProjectStore


def create_app() -> Flask:
    """Create and configure the Flask application."""

    app = Flask(__name__)
    logger = setup_logger()

    store = ProjectStore()
    project_service = ProjectService(store)
    knowledge_service = KnowledgeService()

    app.register_blueprint(create_status_blueprint())
    app.register_blueprint(create_projects_blueprint(project_service))
    app.register_blueprint(create_knowledge_blueprint(knowledge_service))

    @app.errorhandler(ApiError)
    def handle_api_error(exc: ApiError):
        logger.warning("API error: %s", exc)
        detail: ErrorDetail = exc.to_error_detail()
        return jsonify({"error": detail.__dict__}), exc.status_code

    @app.errorhandler(404)
    def handle_not_found(_: Exception):
        exc = NotFoundError("The requested resource was not found.")
        detail = exc.to_error_detail()
        return jsonify({"error": detail.__dict__}), exc.status_code

    @app.errorhandler(Exception)
    def handle_unexpected_error(exc: Exception):
        logger.exception("Unhandled error: %s", exc)
        detail = ErrorDetail(message="Internal server error", code="internal_error")
        return jsonify({"error": detail.__dict__}), 500

    return app


app = create_app()
