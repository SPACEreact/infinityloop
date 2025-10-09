"""Status and service metadata endpoints."""
from __future__ import annotations

from datetime import datetime
from flask import Blueprint, jsonify


def create_status_blueprint() -> Blueprint:
    bp = Blueprint("status", __name__, url_prefix="/api/status")

    @bp.get("/")
    def status() -> tuple:
        payload = {
            "status": "ok",
            "timestamp": datetime.utcnow().isoformat() + "Z",
        }
        return jsonify(payload), 200

    @bp.get("/health")
    def health() -> tuple:
        payload = {
            "status": "healthy",
            "timestamp": datetime.utcnow().isoformat() + "Z",
        }
        return jsonify(payload), 200

    return bp
