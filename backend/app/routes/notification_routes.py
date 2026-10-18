"""Notification REST API routes for all authenticated users."""
from flask import Blueprint, request
from flask_jwt_extended import current_user, jwt_required
from app.extensions import db
from app.models.system import Notification
from app.utils.response import success_response, error_response

notification_bp = Blueprint("notifications", __name__)


@notification_bp.route("", methods=["GET"])
@jwt_required()
def list_notifications():
    """Lists notifications for current user with unread count."""
    if not current_user:
        return error_response(message="User not found", status_code=404)

    is_unread_only = request.args.get("unread", "").lower() in ("true", "1")
    query = Notification.query.filter_by(user_id=current_user.id)

    if is_unread_only:
        query = query.filter_by(is_read=False)

    notifications = query.order_by(Notification.created_at.desc()).limit(50).all()
    unread_count = Notification.query.filter_by(user_id=current_user.id, is_read=False).count()

    return success_response(
        data={
            "notifications": [n.to_dict() for n in notifications],
            "unread_count": unread_count,
        },
        message="Notifications retrieved successfully."
    )


@notification_bp.route("/<int:id>/read", methods=["PUT"])
@jwt_required()
def mark_as_read(id):
    """Marks a notification as read."""
    notif = Notification.query.filter_by(id=id, user_id=current_user.id).first()
    if not notif:
        return error_response(message="Notification not found", status_code=404)

    notif.is_read = True
    db.session.commit()
    return success_response(data={"notification": notif.to_dict()}, message="Notification marked as read.")


@notification_bp.route("/read-all", methods=["PUT"])
@jwt_required()
def mark_all_as_read():
    """Marks all notifications for current user as read."""
    Notification.query.filter_by(user_id=current_user.id, is_read=False).update({"is_read": True})
    db.session.commit()
    return success_response(message="All notifications marked as read.")
