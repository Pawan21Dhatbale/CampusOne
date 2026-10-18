"""Academic structures: AcademicYear, Semester, Class, Subject, Enrollment, and FacultySubjectAssignment."""
from datetime import datetime
from app.extensions import db


class AcademicYear(db.Model):
    """Academic Year entity (e.g., 2024-2025)."""
    __tablename__ = "academic_years"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), unique=True, nullable=False)  # E.g. "2024-2025"
    start_date = db.Column(db.Date, nullable=False)
    end_date = db.Column(db.Date, nullable=False)
    is_current = db.Column(db.Boolean, default=False, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    semesters = db.relationship("Semester", back_populates="academic_year", cascade="all, delete-orphan")
    enrollments = db.relationship("StudentEnrollment", back_populates="academic_year")

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "start_date": self.start_date.isoformat() if self.start_date else None,
            "end_date": self.end_date.isoformat() if self.end_date else None,
            "is_current": self.is_current,
        }


class Semester(db.Model):
    """Semester entity within an academic year."""
    __tablename__ = "semesters"

    id = db.Column(db.Integer, primary_key=True)
    academic_year_id = db.Column(db.Integer, db.ForeignKey("academic_years.id", ondelete="CASCADE"), nullable=False)
    name = db.Column(db.String(50), nullable=False)  # E.g. "Fall 2024" or "Semester 5"
    semester_number = db.Column(db.Integer, nullable=False)
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    academic_year = db.relationship("AcademicYear", back_populates="semesters")
    classes = db.relationship("Class", back_populates="semester", cascade="all, delete-orphan")
    subjects = db.relationship("Subject", back_populates="semester", cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id,
            "academic_year_id": self.academic_year_id,
            "academic_year_name": self.academic_year.name if self.academic_year else None,
            "name": self.name,
            "semester_number": self.semester_number,
            "is_active": self.is_active,
        }


class Class(db.Model):
    """Class or batch with specific section (e.g. B.Tech CSE 3rd Year Section A)."""
    __tablename__ = "classes"
    __table_args__ = (
        db.UniqueConstraint("code", "section", "semester_id", name="uq_class_code_section_semester"),
    )

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)  # E.g. "B.Tech Computer Science"
    code = db.Column(db.String(50), nullable=False)   # E.g. "CS-3"
    section = db.Column(db.String(10), default="A", nullable=False)  # E.g. "A"
    semester_id = db.Column(db.Integer, db.ForeignKey("semesters.id", ondelete="SET NULL"), nullable=True)
    capacity = db.Column(db.Integer, default=60)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    semester = db.relationship("Semester", back_populates="classes")
    students = db.relationship("StudentProfile", back_populates="current_class")
    enrollments = db.relationship("StudentEnrollment", back_populates="class_ref")
    faculty_assignments = db.relationship("FacultySubjectAssignment", back_populates="class_ref")
    timetable_entries = db.relationship("TimetableEntry", back_populates="class_ref")

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "code": self.code,
            "section": self.section,
            "display_name": f"{self.code} - Sec {self.section} ({self.name})",
            "semester_id": self.semester_id,
            "semester_name": self.semester.name if self.semester else None,
            "capacity": self.capacity,
            "student_count": len(self.students) if self.students else 0,
        }


class Subject(db.Model):
    """Subject/Course entity."""
    __tablename__ = "subjects"
    __table_args__ = (
        db.UniqueConstraint("code", "semester_id", name="uq_subject_code_semester"),
    )

    id = db.Column(db.Integer, primary_key=True)
    code = db.Column(db.String(50), nullable=False, index=True)  # E.g. "CS301"
    name = db.Column(db.String(120), nullable=False)             # E.g. "Data Structures"
    description = db.Column(db.Text, nullable=True)
    credits = db.Column(db.Integer, default=3, nullable=False)
    semester_id = db.Column(db.Integer, db.ForeignKey("semesters.id", ondelete="SET NULL"), nullable=True)
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    semester = db.relationship("Semester", back_populates="subjects")
    faculty_assignments = db.relationship("FacultySubjectAssignment", back_populates="subject")
    timetable_entries = db.relationship("TimetableEntry", back_populates="subject")

    def to_dict(self):
        return {
            "id": self.id,
            "code": self.code,
            "name": self.name,
            "description": self.description,
            "credits": self.credits,
            "semester_id": self.semester_id,
            "semester_name": self.semester.name if self.semester else None,
            "is_active": self.is_active,
        }


class StudentEnrollment(db.Model):
    """Enrollment mapping students to class and academic year."""
    __tablename__ = "student_enrollments"
    __table_args__ = (
        db.UniqueConstraint("student_id", "class_id", "academic_year_id", name="uq_student_enrollment"),
    )

    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey("student_profiles.id", ondelete="CASCADE"), nullable=False)
    class_id = db.Column(db.Integer, db.ForeignKey("classes.id", ondelete="CASCADE"), nullable=False)
    academic_year_id = db.Column(db.Integer, db.ForeignKey("academic_years.id", ondelete="CASCADE"), nullable=False)
    enrollment_date = db.Column(db.Date, default=datetime.utcnow, nullable=False)
    status = db.Column(db.String(20), default="ACTIVE", nullable=False)  # ACTIVE, COMPLETED, DROPPED
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    student = db.relationship("StudentProfile", back_populates="enrollments")
    class_ref = db.relationship("Class", back_populates="enrollments")
    academic_year = db.relationship("AcademicYear", back_populates="enrollments")

    def to_dict(self):
        return {
            "id": self.id,
            "student_id": self.student_id,
            "class_id": self.class_id,
            "academic_year_id": self.academic_year_id,
            "status": self.status,
            "enrollment_date": self.enrollment_date.isoformat() if self.enrollment_date else None,
        }


class FacultySubjectAssignment(db.Model):
    """Authorization mapping defining which faculty teaches which subject to which class."""
    __tablename__ = "faculty_subject_assignments"
    __table_args__ = (
        db.UniqueConstraint("faculty_id", "subject_id", "class_id", "academic_year_id", name="uq_faculty_subject_class_year"),
    )

    id = db.Column(db.Integer, primary_key=True)
    faculty_id = db.Column(db.Integer, db.ForeignKey("faculty_profiles.id", ondelete="CASCADE"), nullable=False)
    subject_id = db.Column(db.Integer, db.ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False)
    class_id = db.Column(db.Integer, db.ForeignKey("classes.id", ondelete="CASCADE"), nullable=False)
    academic_year_id = db.Column(db.Integer, db.ForeignKey("academic_years.id", ondelete="CASCADE"), nullable=False)
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    faculty = db.relationship("FacultyProfile", back_populates="subject_assignments")
    subject = db.relationship("Subject", back_populates="faculty_assignments")
    class_ref = db.relationship("Class", back_populates="faculty_assignments")
    academic_year = db.relationship("AcademicYear")

    def to_dict(self):
        return {
            "id": self.id,
            "faculty_id": self.faculty_id,
            "faculty_name": self.faculty.user.full_name if self.faculty and self.faculty.user else None,
            "subject_id": self.subject_id,
            "subject_code": self.subject.code if self.subject else None,
            "subject_name": self.subject.name if self.subject else None,
            "class_id": self.class_id,
            "class_name": self.class_ref.name if self.class_ref else None,
            "class_code": self.class_ref.code if self.class_ref else None,
            "section": self.class_ref.section if self.class_ref else None,
            "academic_year_id": self.academic_year_id,
            "is_active": self.is_active,
        }
