"""Standardized JSON API response helpers."""
from flask import jsonify


def success_response(data=None, message="Operation successful", status_code=200):
    """Returns a standardized success JSON response."""
    payload = {
        "success": True,
        "message": message,
    }
    if data is not None:
        payload["data"] = data
    return jsonify(payload), status_code


def error_response(message="An error occurred", error_code="ERROR", status_code=400, errors=None):
    """Returns a standardized error JSON response."""
    payload = {
        "success": False,
        "message": message,
        "error_code": error_code,
    }
    if errors is not None:
        payload["errors"] = errors
    return jsonify(payload), status_code
