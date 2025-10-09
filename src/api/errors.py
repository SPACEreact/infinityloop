"""Custom exceptions and error response helpers for the API layer."""
from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Mapping


@dataclass(frozen=True)
class ErrorDetail:
    """Serializable error payload used by the API error handler."""

    message: str
    code: str
    details: Mapping[str, Any] | None = None


class ApiError(Exception):
    """Base exception for all API specific errors."""

    status_code: int = 400
    error_code: str = "bad_request"

    def __init__(self, message: str, *, status_code: int | None = None, error_code: str | None = None, details: Mapping[str, Any] | None = None) -> None:
        super().__init__(message)
        if status_code is not None:
            self.status_code = status_code
        if error_code is not None:
            self.error_code = error_code
        self.details = details

    def to_error_detail(self) -> ErrorDetail:
        return ErrorDetail(message=str(self), code=self.error_code, details=self.details)


class NotFoundError(ApiError):
    """Raised when a requested resource cannot be located."""

    status_code = 404
    error_code = "not_found"


class ConflictError(ApiError):
    """Raised when a request would violate data invariants."""

    status_code = 409
    error_code = "conflict"


class ValidationError(ApiError):
    """Raised when the client submits invalid data."""

    status_code = 422
    error_code = "validation_error"
