"""Notification service to dispatch and manage in-app notifications."""
import json
from app.extensions import db
from app.models.system import Notification


class NotificationService:
    @staticmethod
    def notify(user_id: int, title: str, message: str, notification_type: str = "ANNOUNCEMENT", data: dict = None):
        """Creates an in-app notification for a user."""
        try:
            payload = json.dumps(data) if data else None
            notif = Notification(
                user_id=user_id,
                title=title,
                message=message,
                notification_type=notification_type,
                data_payload=payload,
            )
            db.session.add(notif)
            db.session.commit()
            return notif
        except Exception as e:
            print(f"[NotificationService Error] Could not create notification: {e}")
            db.session.rollback()
            return None

    @staticmethod
    def notify_absence(student, session):
        """Notifies a student and their linked parent(s) about a recorded absence."""
        subject_name = session.timetable_entry.subject.name if session.timetable_entry and session.timetable_entry.subject else "Class"
        date_str = session.lecture_date.strftime("%Y-%m-%d")
        
        # 1. Notify Student
        if student.user_id:
            NotificationService.notify(
                user_id=student.user_id,
                title="Absence Recorded",
                message=f"You were marked absent for {subject_name} on {date_str}.",
                notification_type="ABSENCE_RECORDED",
                data={"session_id": session.id, "subject": subject_name, "date": date_str}
            )

        # 2. Notify Linked Parent(s)
        for link in student.parent_links:
            if link.parent and link.parent.user_id:
                NotificationService.notify(
                    user_id=link.parent.user_id,
                    title="Child Absence Alert",
                    message=f"Your child {student.user.full_name} was marked absent for {subject_name} on {date_str}.",
                    notification_type="ABSENCE_RECORDED",
                    data={"student_id": student.id, "student_name": student.user.full_name, "date": date_str}
                )

    @staticmethod
    def notify_shortage(student, subject_name, percentage, threshold=75.0):
        """Notifies student and parents when attendance falls below minimum threshold."""
        title = "Low Attendance Warning"
        msg = f"Attendance for {subject_name} is currently {percentage:.1f}%, which is below the required {threshold:.1f}% threshold."
        
        if student.user_id:
            NotificationService.notify(
                user_id=student.user_id,
                title=title,
                message=msg,
                notification_type="ATTENDANCE_SHORTAGE",
                data={"percentage": percentage, "threshold": threshold, "subject": subject_name}
            )

        for link in student.parent_links:
            if link.parent and link.parent.user_id:
                NotificationService.notify(
                    user_id=link.parent.user_id,
                    title=f"Attendance Warning: {student.user.full_name}",
                    message=f"Your child {student.user.full_name}'s attendance in {subject_name} has fallen to {percentage:.1f}%.",
                    notification_type="ATTENDANCE_SHORTAGE",
                    data={"student_id": student.id, "percentage": percentage, "threshold": threshold}
                )
