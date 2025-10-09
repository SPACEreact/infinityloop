"""Expose the Flask application factory for external consumers."""
from __future__ import annotations

from .main import create_app

__all__ = ["create_app"]
