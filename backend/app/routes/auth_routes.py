import secrets
from datetime import datetime, timedelta
from flask import Blueprint, request, current_app
from flask_jwt_extended import (
    create_access_token,
    create_refresh_token,
    jwt_required,
    get_jwt_identity,
    get_jwt,
    current_user,
)
from app.extensions import db
from app.models.user import User, StudentProfile, ParentProfile
from app.models.system import TokenBlocklist
from app.services.audit_service import AuditService
from app.services.email_service import EmailService
from app.utils.response import success_response, error_response
from app.utils.validators import validate_prn_email, validate_mitaoe_email

auth_bp = Blueprint("auth", __name__)


@auth_bp.route("/login", methods=["POST"])
def login():
    """
    User login endpoint.
    Accepts 12-digit PRN email (e.g. 202501100063@mitaoe.ac.in), PRN number, or institutional staff email and password.
    Returns access token, refresh token, and authenticated user details.
    """
    data = request.get_json() or {}
    identifier = (data.get("email") or data.get("username") or "").strip().lower()
    password = data.get("password", "")

    if not identifier or not password:
        return error_response(
            message="Email/username and password are required.",
            error_code="VALIDATION_ERROR",
            status_code=400,
        )

    is_testing = current_app.config.get("TESTING", False)

    # 1. Enforce MIT AOE institutional email restrictions if an email was supplied
    if "@" in identifier:
        if not validate_mitaoe_email(identifier, is_testing=is_testing):
            return error_response(
                message="Access denied. Only @mitaoe.ac.in institutional emails are authorized to sign in. Students must use their 12-digit PRN email (e.g. 202501100063@mitaoe.ac.in).",
                error_code="INVALID_INSTITUTIONAL_EMAIL",
                status_code=403,
            )
        prefix = identifier.split("@")[0]
        if prefix.isdigit() and len(prefix) != 12:
            return error_response(
                message="Invalid student PRN email. The PRN must be exactly 12 digits (e.g. 202501100063@mitaoe.ac.in).",
                error_code="INVALID_PRN_FORMAT",
                status_code=400,
            )

    # 2. Dynamic lookup: by email, username, or by 12-digit PRN
    lookup_filter = (User.email.ilike(identifier)) | (User.username.ilike(identifier))
    if identifier.isdigit() and len(identifier) == 12:
        lookup_filter = lookup_filter | (User.email.ilike(f"{identifier}@mitaoe.ac.in"))

    user = User.query.filter(lookup_filter).first()

    if not user or not user.check_password(password):
        # Log failed attempt
        AuditService.log(
            action="LOGIN_FAILED",
            details={"attempted_identifier": identifier},
        )
        return error_response(
            message="Invalid credentials. Please verify your email and password.",
            error_code="INVALID_CREDENTIALS",
            status_code=401,
        )

    # 3. Enforce 12-digit PRN format for student accounts
    if user.role == "student":
        is_prn_valid, _ = validate_prn_email(user.email, is_testing=is_testing)
        if not is_prn_valid:
            return error_response(
                message="Student login denied. Your account email must follow the 12-digit PRN format (e.g. 202501100063@mitaoe.ac.in).",
                error_code="INVALID_STUDENT_EMAIL",
                status_code=403,
            )

    if not user.is_active:
        return error_response(
            message="Your account has been deactivated. Please contact your college administrator.",
            error_code="ACCOUNT_DEACTIVATED",
            status_code=403,
        )

    # Ensure email is verified for direct friction-free access without requiring SMTP
    if not user.is_email_verified:
        user.is_email_verified = True
        db.session.commit()

    # Issue JWT tokens
    # Store role and user_id in identity or additional claims
    additional_claims = {
        "role": user.role,
        "email": user.email,
        "full_name": user.full_name,
    }
    access_token = create_access_token(identity=user.id, additional_claims=additional_claims)
    refresh_token = create_refresh_token(identity=user.id)

    # Audit successful login
    AuditService.log(
        action="LOGIN_SUCCESS",
        user_id=user.id,
        details={"role": user.role},
    )

    return success_response(
        data={
            "access_token": access_token,
            "refresh_token": refresh_token,
            "user": user.to_dict(),
        },
        message=f"Welcome back, {user.full_name}!",
    )


@auth_bp.route("/refresh", methods=["POST"])
@jwt_required(refresh=True)
def refresh():
    """Refreshes the access token using a valid refresh token."""
    user_id = get_jwt_identity()
    user = User.query.get(user_id)

    if not user or not user.is_active:
        return error_response(
            message="User not found or account deactivated.",
            error_code="UNAUTHORIZED",
            status_code=401,
        )

    additional_claims = {
        "role": user.role,
        "email": user.email,
        "full_name": user.full_name,
    }
    new_access_token = create_access_token(identity=user.id, additional_claims=additional_claims)

    return success_response(
        data={"access_token": new_access_token},
        message="Access token refreshed successfully.",
    )


@auth_bp.route("/logout", methods=["POST"])
@jwt_required()
def logout():
    """Revokes the current JWT access token."""
    jwt_data = get_jwt()
    jti = jwt_data.get("jti")

    if jti:
        revoked_token = TokenBlocklist(jti=jti)
        db.session.add(revoked_token)
        db.session.commit()

    if current_user:
        AuditService.log(
            action="LOGOUT",
            user_id=current_user.id,
        )

    return success_response(message="Logged out successfully.")


@auth_bp.route("/me", methods=["GET"])
@jwt_required()
def get_current_user():
    """Returns the authenticated user's profile and role information."""
    if not current_user:
        return error_response(message="User not found", status_code=404)

    return success_response(
        data={"user": current_user.to_dict()},
        message="Profile retrieved successfully.",
    )


@auth_bp.route("/register", methods=["POST"])
def register():
    """
    Self-service registration endpoint for students and parents.
    Enforces institutional email domain restrictions.
    """
    data = request.get_json() or {}
    full_name = (data.get("full_name") or "").strip()
    email = (data.get("email") or "").strip().lower()
    username = (data.get("username") or "").strip() or email.split("@")[0]
    password = data.get("password", "")
    role = (data.get("role") or "student").strip().lower()
    institutional_id = (data.get("institutional_id") or "").strip()

    if not full_name or not email or not password:
        return error_response(
            message="Full name, email, and password are required.",
            error_code="VALIDATION_ERROR",
            status_code=400,
        )

    if len(password) < 6:
        return error_response(
            message="Password must be at least 6 characters.",
            error_code="WEAK_PASSWORD",
            status_code=400,
        )

    if role not in ("student", "parent"):
        return error_response(
            message="Self-service registration is only available for students and parents. Faculty and Admin accounts are provisioned by the Administrator.",
            error_code="FORBIDDEN_ROLE",
            status_code=403,
        )

    # Enforce 12-digit PRN institutional email format for student registration
    is_testing = current_app.config.get("TESTING", False)
    is_prn_valid, prn = validate_prn_email(email, is_testing=is_testing)

    if not is_prn_valid:
        return error_response(
            message="Registration is restricted to MIT AOE institutional emails containing your 12-digit PRN (e.g. 202501100063@mitaoe.ac.in).",
            error_code="INVALID_PRN_EMAIL",
            status_code=400,
        )

    # Automatically bind student_id and username to the 12-digit PRN
    student_id = prn
    username = username or prn

    # Check for duplicate email or username
    if User.query.filter((User.email.ilike(email)) | (User.username.ilike(username))).first():
        return error_response(
            message="An account with this email address or PRN already exists.",
            error_code="DUPLICATE_USER",
            status_code=409,
        )

    # Check duplicate student_id if role is student
    if role == "student":
        if StudentProfile.query.filter_by(student_id=student_id).first():
            return error_response(
                message=f"Student PRN '{student_id}' is already registered.",
                error_code="DUPLICATE_STUDENT_ID",
                status_code=409,
            )

    new_user = User(
        full_name=full_name,
        email=email,
        username=username,
        role=role,
        is_active=True,
        is_email_verified=True,
        verification_token=None,
    )
    new_user.set_password(password)
    db.session.add(new_user)
    db.session.flush()

    if role == "student":
        student_prof = StudentProfile(
            user_id=new_user.id,
            student_id=student_id,
            roll_number=student_id,
        )
        db.session.add(student_prof)
    elif role == "parent":
        parent_prof = ParentProfile(
            user_id=new_user.id,
        )
        db.session.add(parent_prof)

    db.session.commit()

    AuditService.log(
        action="USER_REGISTERED",
        user_id=new_user.id,
        details={"role": role, "email": email, "is_verified": True},
    )

    resp_data = {
        "user": new_user.to_dict(),
        "requires_verification": False,
    }

    return success_response(
        data=resp_data,
        message="Registration successful! Your account is active. You may now sign in directly.",
        status_code=201,
    )


@auth_bp.route("/verify-email", methods=["POST", "GET"])
def verify_email():
    """Confirms and activates user account using token."""
    token = None
    if request.method == "POST":
        data = request.get_json() or {}
        token = (data.get("token") or "").strip()
    if not token:
        token = (request.args.get("token") or "").strip()

    if not token:
        return error_response(message="Verification token is required.", status_code=400)

    user = User.query.filter_by(verification_token=token).first()
    if not user:
        return error_response(
            message="Invalid or expired verification token.",
            error_code="INVALID_TOKEN",
            status_code=400,
        )

    user.is_email_verified = True
    user.verification_token = None
    db.session.commit()

    AuditService.log(
        action="EMAIL_VERIFIED",
        user_id=user.id,
        details={"email": user.email},
    )

    return success_response(
        message="Email address verified successfully! You may now sign in.",
    )


@auth_bp.route("/resend-verification", methods=["POST"])
def resend_verification():
    """Resends email verification instructions to an unverified user."""
    data = request.get_json() or {}
    email = (data.get("email") or "").strip().lower()

    if not email:
        return error_response(message="Email address is required.", status_code=400)

    user = User.query.filter(User.email.ilike(email)).first()
    if user and not user.is_email_verified:
        token = secrets.token_urlsafe(32)
        user.verification_token = token
        db.session.commit()

        EmailService.send_verification_email(user.email, token, user.full_name)

        AuditService.log(
            action="VERIFICATION_EMAIL_RESENT",
            user_id=user.id,
            details={"email": user.email},
        )

    return success_response(
        message="If an unverified account exists for this email, a new verification link has been dispatched.",
    )


@auth_bp.route("/forgot-password", methods=["POST"])
def forgot_password():
    """Handles password reset request by generating a time-limited reset token."""
    data = request.get_json() or {}
    email = (data.get("email") or "").strip().lower()

    if not email:
        return error_response(message="Email address is required.", status_code=400)

    user = User.query.filter(User.email.ilike(email)).first()
    reset_token = None
    if user:
        reset_token = secrets.token_urlsafe(32)
        user.reset_token = reset_token
        user.reset_token_expiry = datetime.utcnow() + timedelta(hours=1)
        db.session.commit()

        EmailService.send_password_reset_email(user.email, reset_token, user.full_name)

        AuditService.log(
            action="PASSWORD_RESET_REQUESTED",
            user_id=user.id,
            details={"email": user.email},
        )

    # In development or testing mode, return reset_token to facilitate recovery verification
    resp_data = {}
    if current_app.config.get("TESTING") or current_app.config.get("DEBUG"):
        if reset_token:
            resp_data["reset_token"] = reset_token

    return success_response(
        data=resp_data if resp_data else None,
        message="If this email is registered in our system, password reset instructions have been dispatched.",
    )


@auth_bp.route("/reset-password", methods=["POST"])
def reset_password():
    """Handles password reset confirmation requiring a valid token."""
    data = request.get_json() or {}
    token = (data.get("token") or "").strip()
    new_password = data.get("new_password", "")

    if not token or not new_password or len(new_password) < 6:
        return error_response(
            message="Valid reset token and new password (min 6 chars) are required.",
            status_code=400,
        )

    user = User.query.filter_by(reset_token=token).first()
    if not user:
        return error_response(
            message="Invalid or unrecognized password reset token.",
            error_code="INVALID_TOKEN",
            status_code=400,
        )

    if user.reset_token_expiry and user.reset_token_expiry < datetime.utcnow():
        user.reset_token = None
        user.reset_token_expiry = None
        db.session.commit()
        return error_response(
            message="Password reset token has expired. Please request a new one.",
            error_code="TOKEN_EXPIRED",
            status_code=400,
        )

    user.set_password(new_password)
    user.reset_token = None
    user.reset_token_expiry = None
    db.session.commit()

    AuditService.log(
        action="PASSWORD_RESET_COMPLETED",
        user_id=user.id,
        details={"email": user.email},
    )

    return success_response(message="Password reset successfully. You may now log in with your new password.")
