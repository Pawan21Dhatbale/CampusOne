"""Timetable entry model with scheduling and conflict validation fields."""
from datetime import datetime
from app.extensions import db


class TimetableEntry(db.Model):
    """Timetable entry representing a regular scheduled lecture."""
    __tablename__ = "timetable_entries"

    id = db.Column(db.Integer, primary_key=True)
    class_id = db.Column(db.Integer, db.ForeignKey("classes.id", ondelete="CASCADE"), nullable=False, index=True)
    subject_id = db.Column(db.Integer, db.ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False, index=True)
    faculty_id = db.Column(db.Integer, db.ForeignKey("faculty_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    day_of_week = db.Column(db.String(15), nullable=False, index=True)  # Monday, Tuesday, ...
    start_time = db.Column(db.Time, nullable=False)
    end_time = db.Column(db.Time, nullable=False)
    room_number = db.Column(db.String(50), nullable=True)
    academic_year_id = db.Column(db.Integer, db.ForeignKey("academic_years.id", ondelete="CASCADE"), nullable=True)
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    status = db.Column(db.String(20), default="published", nullable=False)  # 'draft', 'published'
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    class_ref = db.relationship("Class", back_populates="timetable_entries")
    subject = db.relationship("Subject", back_populates="timetable_entries")
    faculty = db.relationship("FacultyProfile", back_populates="timetable_entries")
    academic_year = db.relationship("AcademicYear")
    attendance_sessions = db.relationship("AttendanceSession", back_populates="timetable_entry", cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id,
            "class_id": self.class_id,
            "class_name": self.class_ref.name if self.class_ref else None,
            "class_code": self.class_ref.code if self.class_ref else None,
            "section": self.class_ref.section if self.class_ref else None,
            "subject_id": self.subject_id,
            "subject_name": self.subject.name if self.subject else None,
            "subject_code": self.subject.code if self.subject else None,
            "faculty_id": self.faculty_id,
            "faculty_name": self.faculty.user.full_name if self.faculty and self.faculty.user else None,
            "day_of_week": self.day_of_week,
            "start_time": self.start_time.strftime("%H:%M") if self.start_time else None,
            "end_time": self.end_time.strftime("%H:%M") if self.end_time else None,
            "room_number": self.room_number,
            "academic_year_id": self.academic_year_id,
            "is_active": self.is_active,
            "status": self.status,
        }
