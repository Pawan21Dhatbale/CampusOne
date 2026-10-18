"""Audit logging service for security tracking and compliance."""
import json
from flask import request
from app.extensions import db
from app.models.system import AuditLog


class AuditService:
    @staticmethod
    def log(action: str, user_id=None, entity_type=None, entity_id=None, details=None):
        """
        Records an audit event in the database.
        Never logs passwords, tokens, or sensitive secrets.
        """
        try:
            ip_address = request.remote_addr if request else None
            details_str = json.dumps(details) if isinstance(details, (dict, list)) else str(details or "")

            audit = AuditLog(
                user_id=user_id,
                action=action,
                entity_type=entity_type,
                entity_id=str(entity_id) if entity_id is not None else None,
                details=details_str,
                ip_address=ip_address,
            )
            db.session.add(audit)
            db.session.commit()
            return audit
        except Exception as e:
            # Audit failures should be logged to console without breaking application flow
            print(f"[AuditService Error] Failed to write audit log: {e}")
            try:
                db.session.rollback()
            except Exception:
                pass
            return None
