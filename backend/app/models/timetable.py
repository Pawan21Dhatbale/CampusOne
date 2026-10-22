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


class LectureSwap(db.Model):
    """Lecture swap or substitution request between faculty members."""
    __tablename__ = "lecture_swaps"

    id = db.Column(db.Integer, primary_key=True)
    timetable_entry_id = db.Column(db.Integer, db.ForeignKey("timetable_entries.id", ondelete="CASCADE"), nullable=False, index=True)
    requesting_faculty_id = db.Column(db.Integer, db.ForeignKey("faculty_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    substitute_faculty_id = db.Column(db.Integer, db.ForeignKey("faculty_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    target_date = db.Column(db.Date, nullable=False, index=True)  # Date of the lecture to be swapped/substituted
    target_timetable_entry_id = db.Column(db.Integer, db.ForeignKey("timetable_entries.id", ondelete="SET NULL"), nullable=True)  # Optional reciprocal slot
    target_swap_date = db.Column(db.Date, nullable=True)  # Optional reciprocal date
    reason = db.Column(db.String(255), nullable=True)
    status = db.Column(db.String(20), default="PENDING", nullable=False)  # 'PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED'
    notes = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    timetable_entry = db.relationship("TimetableEntry", foreign_keys=[timetable_entry_id], backref=db.backref("swaps", cascade="all, delete-orphan"))
    target_timetable_entry = db.relationship("TimetableEntry", foreign_keys=[target_timetable_entry_id])
    requesting_faculty = db.relationship("FacultyProfile", foreign_keys=[requesting_faculty_id])
    substitute_faculty = db.relationship("FacultyProfile", foreign_keys=[substitute_faculty_id])

    def to_dict(self):
        req_user = self.requesting_faculty.user if self.requesting_faculty else None
        sub_user = self.substitute_faculty.user if self.substitute_faculty else None
        entry = self.timetable_entry
        target_entry = self.target_timetable_entry

        return {
            "id": self.id,
            "timetable_entry_id": self.timetable_entry_id,
            "requesting_faculty_id": self.requesting_faculty_id,
            "requesting_faculty_name": req_user.full_name if req_user else None,
            "requesting_faculty_email": req_user.email if req_user else None,
            "substitute_faculty_id": self.substitute_faculty_id,
            "substitute_faculty_name": sub_user.full_name if sub_user else None,
            "substitute_faculty_email": sub_user.email if sub_user else None,
            "target_date": self.target_date.isoformat() if self.target_date else None,
            "target_timetable_entry_id": self.target_timetable_entry_id,
            "target_swap_date": self.target_swap_date.isoformat() if self.target_swap_date else None,
            "reason": self.reason,
            "status": self.status,
            "notes": self.notes,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "entry": {
                "id": entry.id,
                "subject_code": entry.subject.code if entry.subject else None,
                "subject_name": entry.subject.name if entry.subject else None,
                "class_code": entry.class_ref.code if entry.class_ref else None,
                "class_name": entry.class_ref.name if entry.class_ref else None,
                "section": entry.class_ref.section if entry.class_ref else None,
                "day_of_week": entry.day_of_week,
                "start_time": entry.start_time.strftime("%H:%M") if entry.start_time else None,
                "end_time": entry.end_time.strftime("%H:%M") if entry.end_time else None,
                "room_number": entry.room_number,
            } if entry else None,
            "target_entry": {
                "id": target_entry.id,
                "subject_code": target_entry.subject.code if target_entry.subject else None,
                "subject_name": target_entry.subject.name if target_entry.subject else None,
                "class_code": target_entry.class_ref.code if target_entry.class_ref else None,
                "class_name": target_entry.class_ref.name if target_entry.class_ref else None,
                "section": target_entry.class_ref.section if target_entry.class_ref else None,
                "day_of_week": target_entry.day_of_week,
                "start_time": target_entry.start_time.strftime("%H:%M") if target_entry.start_time else None,
                "end_time": target_entry.end_time.strftime("%H:%M") if target_entry.end_time else None,
                "room_number": target_entry.room_number,
            } if target_entry else None,
        }

