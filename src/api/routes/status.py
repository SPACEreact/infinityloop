"""Status and service metadata endpoints."""
from __future__ import annotations

from datetime import datetime
from flask import Blueprint, jsonify


def _status_payload(status: str) -> dict:
    return {
        "status": status,
        "timestamp": datetime.utcnow().isoformat() + "Z",
    }


def create_status_blueprint() -> Blueprint:
    """Expose health routes for both legacy and namespaced clients."""

    bp = Blueprint("status", __name__)

    @bp.get("/status")
    def status_root() -> tuple:
        return jsonify({"status": "running"}), 200

    @bp.get("/welcome")
    def welcome() -> tuple:
        return jsonify({"message": "Welcome to the Flask API Service!"}), 200

    @bp.get("/status/health")
    def status_health() -> tuple:
        return jsonify(_status_payload("healthy")), 200

    @bp.get("/api/status")
    def api_status() -> tuple:
        return jsonify(_status_payload("ok")), 200

    @bp.get("/api/status/health")
    def api_health() -> tuple:
        return jsonify(_status_payload("healthy")), 200

    return bp
