"""SmartAttend Flask Application Factory."""
import os
from flask import Flask, jsonify
from app.config import config_by_name
from app.extensions import db, migrate, jwt, bcrypt, cors
from app.models.user import User
from app.models.system import TokenBlocklist
from app.utils.response import error_response, success_response


def create_app(config_name=None):
    """Factory creating and configuring the Flask application instance."""
    if config_name is None:
        config_name = os.getenv("FLASK_ENV", "development")

    app = Flask(__name__)
    app.config.from_object(config_by_name.get(config_name, config_by_name["default"]))

    # Initialize extensions
    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    bcrypt.init_app(app)

    # Configure CORS for configured origins
    cors.init_app(
        app,
        resources={r"/api/*": {"origins": app.config.get("CORS_ORIGINS", "*")}},
        supports_credentials=True,
    )

    # ==========================
    # JWT Callbacks & Handlers
    # ==========================

    @jwt.user_identity_loader
    def user_identity_lookup(user_id):
        return str(user_id)

    @jwt.user_lookup_loader
    def user_lookup_callback(_jwt_header, jwt_data):
        identity = jwt_data["sub"]
        return User.query.get(int(identity))

    @jwt.token_in_blocklist_loader
    def check_if_token_revoked(_jwt_header, jwt_payload):
        jti = jwt_payload["jti"]
        token = TokenBlocklist.query.filter_by(jti=jti).first()
        return token is not None

    @jwt.expired_token_loader
    def expired_token_callback(_jwt_header, _jwt_payload):
        return error_response(
            message="Your session has expired. Please log in again.",
            error_code="TOKEN_EXPIRED",
            status_code=401,
        )

    @jwt.invalid_token_loader
    def invalid_token_callback(error_string):
        return error_response(
            message=f"Invalid security token: {error_string}",
            error_code="TOKEN_INVALID",
            status_code=401,
        )

    @jwt.unauthorized_loader
    def missing_token_callback(error_string):
        return error_response(
            message="Authorization token missing or malformed.",
            error_code="AUTHORIZATION_REQUIRED",
            status_code=401,
        )

    @jwt.revoked_token_loader
    def revoked_token_callback(_jwt_header, _jwt_payload):
        return error_response(
            message="This security token has been revoked.",
            error_code="TOKEN_REVOKED",
            status_code=401,
        )

    # ==========================
    # Register API Blueprints
    # ==========================
    from app.routes.auth_routes import auth_bp
    from app.routes.admin_routes import admin_bp
    from app.routes.faculty_routes import faculty_bp
    from app.routes.student_routes import student_bp
    from app.routes.parent_routes import parent_bp
    from app.routes.notification_routes import notification_bp

    app.register_blueprint(auth_bp, url_prefix="/api/v1/auth")
    app.register_blueprint(admin_bp, url_prefix="/api/v1/admin")
    app.register_blueprint(faculty_bp, url_prefix="/api/v1/faculty")
    app.register_blueprint(student_bp, url_prefix="/api/v1/student")
    app.register_blueprint(parent_bp, url_prefix="/api/v1/parent")
    app.register_blueprint(notification_bp, url_prefix="/api/v1/notifications")

    # ==========================
    # Base / Health Check Routes
    # ==========================

    @app.route("/api/v1/health", methods=["GET"])
    def health_check():
        return success_response(
            data={"status": "healthy", "service": "SmartAttend API", "version": "1.0.0"},
            message="SmartAttend Backend Service is operational."
        )

    # ==========================
    # Global Error Handlers
    # ==========================

    @app.errorhandler(404)
    def handle_not_found(e):
        return error_response(message="Requested endpoint not found.", error_code="NOT_FOUND", status_code=404)

    @app.errorhandler(500)
    def handle_server_error(e):
        import traceback
        err_msg = str(e)
        app.logger.error("Internal Server Error (500):\n%s", traceback.format_exc())
        if app.config.get("DEBUG"):
            return error_response(
                message=f"Internal Server Error: {err_msg}",
                error_code="SERVER_ERROR",
                status_code=500,
            )
        return error_response(message="An internal server error occurred.", error_code="SERVER_ERROR", status_code=500)

    return app
