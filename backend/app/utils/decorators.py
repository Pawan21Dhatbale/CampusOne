"""Custom authentication and RBAC authorization decorators."""
from functools import wraps
from flask_jwt_extended import verify_jwt_in_request, current_user
from app.utils.response import error_response


def role_required(*allowed_roles):
    """
    Decorator that checks if the authenticated user has one of the required roles.
    Usage:
        @role_required('admin')
        @role_required('faculty', 'admin')
    """
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            # Verify JWT in request headers
            verify_jwt_in_request()

            if not current_user:
                return error_response(
                    message="Authentication required",
                    error_code="UNAUTHORIZED",
                    status_code=401,
                )

            if not current_user.is_active:
                return error_response(
                    message="Your account has been deactivated. Please contact the administrator.",
                    error_code="ACCOUNT_DEACTIVATED",
                    status_code=403,
                )

            if current_user.role not in allowed_roles:
                return error_response(
                    message=f"Access denied. Requires one of the following roles: {', '.join(allowed_roles)}",
                    error_code="FORBIDDEN_ROLE",
                    status_code=403,
                )

            return fn(*args, **kwargs)
        return wrapper
    return decorator


def active_user_required(fn):
    """Ensures the authenticated user's account is currently active."""
    @wraps(fn)
    def wrapper(*args, **kwargs):
        verify_jwt_in_request()

        if not current_user:
            return error_response(
                message="Authentication required",
                error_code="UNAUTHORIZED",
                status_code=401,
            )

        if not current_user.is_active:
            return error_response(
                message="Your account has been deactivated. Please contact the administrator.",
                error_code="ACCOUNT_DEACTIVATED",
                status_code=403,
            )

        return fn(*args, **kwargs)
    return wrapper
