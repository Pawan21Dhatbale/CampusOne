"""Attendance models: AttendanceSession, AttendanceRecord, and AttendanceCorrectionRequest."""
from datetime import datetime
from app.extensions import db


class AttendanceSession(db.Model):
    """Represents a specific lecture's attendance event on a given date."""
    __tablename__ = "attendance_sessions"
    __table_args__ = (
        db.UniqueConstraint("timetable_entry_id", "lecture_date", name="uq_session_timetable_date"),
    )

    id = db.Column(db.Integer, primary_key=True)
    timetable_entry_id = db.Column(db.Integer, db.ForeignKey("timetable_entries.id", ondelete="CASCADE"), nullable=False, index=True)
    lecture_date = db.Column(db.Date, nullable=False, index=True)
    actual_start_time = db.Column(db.Time, nullable=True)
    actual_end_time = db.Column(db.Time, nullable=True)
    status = db.Column(db.String(20), default="FINALIZED", nullable=False)  # 'SCHEDULED', 'FINALIZED', 'CANCELLED'
    submitted_by_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    submitted_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=True)
    submission_notes = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    timetable_entry = db.relationship("TimetableEntry", back_populates="attendance_sessions")
    submitted_by = db.relationship("User", foreign_keys=[submitted_by_id])
    records = db.relationship("AttendanceRecord", back_populates="session", cascade="all, delete-orphan")
    correction_requests = db.relationship("AttendanceCorrectionRequest", back_populates="session", cascade="all, delete-orphan")

    def to_dict(self, include_records=False):
        total_students = len(self.records) if self.records else 0
        present_count = sum(1 for r in self.records if r.status == "PRESENT") if self.records else 0
        absent_count = sum(1 for r in self.records if r.status == "ABSENT") if self.records else 0
        percentage = round((present_count / total_students * 100), 2) if total_students > 0 else 0.0

        data = {
            "id": self.id,
            "timetable_entry_id": self.timetable_entry_id,
            "lecture_date": self.lecture_date.isoformat() if self.lecture_date else None,
            "status": self.status,
            "submitted_by_id": self.submitted_by_id,
            "submitted_by_name": self.submitted_by.full_name if self.submitted_by else None,
            "submitted_at": self.submitted_at.isoformat() if self.submitted_at else None,
            "submission_notes": self.submission_notes,
            "subject_name": self.timetable_entry.subject.name if self.timetable_entry and self.timetable_entry.subject else None,
            "subject_code": self.timetable_entry.subject.code if self.timetable_entry and self.timetable_entry.subject else None,
            "class_name": self.timetable_entry.class_ref.name if self.timetable_entry and self.timetable_entry.class_ref else None,
            "class_code": self.timetable_entry.class_ref.code if self.timetable_entry and self.timetable_entry.class_ref else None,
            "section": self.timetable_entry.class_ref.section if self.timetable_entry and self.timetable_entry.class_ref else None,
            "faculty_name": self.timetable_entry.faculty.user.full_name if self.timetable_entry and self.timetable_entry.faculty and self.timetable_entry.faculty.user else None,
            "start_time": self.timetable_entry.start_time.strftime("%H:%M") if self.timetable_entry and self.timetable_entry.start_time else None,
            "end_time": self.timetable_entry.end_time.strftime("%H:%M") if self.timetable_entry and self.timetable_entry.end_time else None,
            "room_number": self.timetable_entry.room_number if self.timetable_entry else None,
            "total_students": total_students,
            "present_count": present_count,
            "absent_count": absent_count,
            "attendance_percentage": percentage,
        }
        if include_records:
            data["records"] = [r.to_dict() for r in self.records]
        return data


class AttendanceRecord(db.Model):
    """Individual student attendance mark for a specific finalized session."""
    __tablename__ = "attendance_records"
    __table_args__ = (
        db.UniqueConstraint("session_id", "student_id", name="uq_session_student_record"),
    )

    id = db.Column(db.Integer, primary_key=True)
    session_id = db.Column(db.Integer, db.ForeignKey("attendance_sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id = db.Column(db.Integer, db.ForeignKey("student_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    status = db.Column(db.String(20), default="PRESENT", nullable=False)  # 'PRESENT', 'ABSENT', 'LEAVE'
    remarks = db.Column(db.String(255), nullable=True)
    marked_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    session = db.relationship("AttendanceSession", back_populates="records")
    student = db.relationship("StudentProfile", back_populates="attendance_records")

    def to_dict(self):
        return {
            "id": self.id,
            "session_id": self.session_id,
            "student_id": self.student_id,
            "roll_number": self.student.roll_number if self.student else None,
            "student_name": self.student.user.full_name if self.student and self.student.user else None,
            "status": self.status,
            "remarks": self.remarks,
            "marked_at": self.marked_at.isoformat() if self.marked_at else None,
        }


class AttendanceCorrectionRequest(db.Model):
    """Workflow entity for requesting corrections to finalized attendance records."""
    __tablename__ = "attendance_correction_requests"

    id = db.Column(db.Integer, primary_key=True)
    session_id = db.Column(db.Integer, db.ForeignKey("attendance_sessions.id", ondelete="CASCADE"), nullable=False)
    student_id = db.Column(db.Integer, db.ForeignKey("student_profiles.id", ondelete="CASCADE"), nullable=False)
    requested_by_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    current_status = db.Column(db.String(20), nullable=False)  # e.g. "ABSENT"
    requested_status = db.Column(db.String(20), nullable=False)  # e.g. "PRESENT"
    reason = db.Column(db.Text, nullable=False)
    status = db.Column(db.String(20), default="PENDING", nullable=False)  # PENDING, APPROVED, REJECTED
    reviewed_by_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    reviewed_at = db.Column(db.DateTime, nullable=True)
    review_comments = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    session = db.relationship("AttendanceSession", back_populates="correction_requests")
    student = db.relationship("StudentProfile")
    requested_by = db.relationship("User", foreign_keys=[requested_by_id])
    reviewed_by = db.relationship("User", foreign_keys=[reviewed_by_id])

    def to_dict(self):
        return {
            "id": self.id,
            "session_id": self.session_id,
            "student_id": self.student_id,
            "student_name": self.student.user.full_name if self.student and self.student.user else None,
            "roll_number": self.student.roll_number if self.student else None,
            "current_status": self.current_status,
            "requested_status": self.requested_status,
            "reason": self.reason,
            "status": self.status,
            "requested_by_id": self.requested_by_id,
            "requested_by_name": self.requested_by.full_name if self.requested_by else None,
            "reviewed_by_name": self.reviewed_by.full_name if self.reviewed_by else None,
            "reviewed_at": self.reviewed_at.isoformat() if self.reviewed_at else None,
            "review_comments": self.review_comments,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
