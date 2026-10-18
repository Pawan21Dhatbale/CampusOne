"""User, StudentProfile, FacultyProfile, ParentProfile, and ParentStudentRelationship models."""
from datetime import datetime
from app.extensions import db, bcrypt


class User(db.Model):
    """User account entity for authentication and core profile."""
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    full_name = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    username = db.Column(db.String(80), unique=True, nullable=True, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(20), nullable=False, index=True)  # 'admin', 'faculty', 'student', 'parent'
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    is_email_verified = db.Column(db.Boolean, default=True, nullable=False)
    verification_token = db.Column(db.String(128), nullable=True, index=True)
    reset_token = db.Column(db.String(128), nullable=True, index=True)
    reset_token_expiry = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    student_profile = db.relationship("StudentProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    faculty_profile = db.relationship("FacultyProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    parent_profile = db.relationship("ParentProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    notifications = db.relationship("Notification", back_populates="user", cascade="all, delete-orphan", lazy="dynamic")
    audit_logs = db.relationship("AuditLog", back_populates="user", lazy="dynamic")

    def set_password(self, password: str):
        """Hashes password with bcrypt."""
        self.password_hash = bcrypt.generate_password_hash(password).decode("utf-8")

    def check_password(self, password: str) -> bool:
        """Verifies password hash."""
        return bcrypt.check_password_hash(self.password_hash, password)

    def to_dict(self):
        """Serializes user for API responses (excluding password hash)."""
        data = {
            "id": self.id,
            "full_name": self.full_name,
            "email": self.email,
            "username": self.username,
            "role": self.role,
            "is_active": self.is_active,
            "is_email_verified": self.is_email_verified,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
        if self.role == "student" and self.student_profile:
            data["student_profile"] = self.student_profile.to_dict()
        elif self.role == "faculty" and self.faculty_profile:
            data["faculty_profile"] = self.faculty_profile.to_dict()
        elif self.role == "parent" and self.parent_profile:
            data["parent_profile"] = self.parent_profile.to_dict()
        return data


class StudentProfile(db.Model):
    """Profile data specific to students."""
    __tablename__ = "student_profiles"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    student_id = db.Column(db.String(50), unique=True, nullable=False, index=True)  # E.g. STU2025001
    roll_number = db.Column(db.String(50), nullable=False, index=True)              # E.g. CS-101
    class_id = db.Column(db.Integer, db.ForeignKey("classes.id"), nullable=True)
    admission_date = db.Column(db.Date, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    user = db.relationship("User", back_populates="student_profile")
    current_class = db.relationship("Class", back_populates="students")
    enrollments = db.relationship("StudentEnrollment", back_populates="student", cascade="all, delete-orphan")
    attendance_records = db.relationship("AttendanceRecord", back_populates="student", cascade="all, delete-orphan")
    parent_links = db.relationship("ParentStudentRelationship", back_populates="student", cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "student_id": self.student_id,
            "roll_number": self.roll_number,
            "class_id": self.class_id,
            "class_name": self.current_class.name if self.current_class else None,
            "class_code": self.current_class.code if self.current_class else None,
            "admission_date": self.admission_date.isoformat() if self.admission_date else None,
            "full_name": self.user.full_name if self.user else None,
            "email": self.user.email if self.user else None,
        }


class FacultyProfile(db.Model):
    """Profile data specific to faculty members."""
    __tablename__ = "faculty_profiles"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    faculty_id = db.Column(db.String(50), unique=True, nullable=False, index=True)  # E.g. FAC2025001
    department = db.Column(db.String(100), nullable=False)
    designation = db.Column(db.String(100), default="Assistant Professor")
    phone = db.Column(db.String(20), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    user = db.relationship("User", back_populates="faculty_profile")
    subject_assignments = db.relationship("FacultySubjectAssignment", back_populates="faculty", cascade="all, delete-orphan")
    timetable_entries = db.relationship("TimetableEntry", back_populates="faculty")

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "faculty_id": self.faculty_id,
            "department": self.department,
            "designation": self.designation,
            "phone": self.phone,
            "full_name": self.user.full_name if self.user else None,
            "email": self.user.email if self.user else None,
        }


class ParentProfile(db.Model):
    """Profile data specific to parents / guardians."""
    __tablename__ = "parent_profiles"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    phone_number = db.Column(db.String(20), nullable=True)
    occupation = db.Column(db.String(100), nullable=True)
    address = db.Column(db.String(255), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    user = db.relationship("User", back_populates="parent_profile")
    student_links = db.relationship("ParentStudentRelationship", back_populates="parent", cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "phone_number": self.phone_number,
            "occupation": self.occupation,
            "address": self.address,
            "full_name": self.user.full_name if self.user else None,
            "email": self.user.email if self.user else None,
        }


class ParentStudentRelationship(db.Model):
    """Explicit mapping linking parents to authorized student(s)."""
    __tablename__ = "parent_student_relationships"
    __table_args__ = (
        db.UniqueConstraint("parent_id", "student_id", name="uq_parent_student"),
    )

    id = db.Column(db.Integer, primary_key=True)
    parent_id = db.Column(db.Integer, db.ForeignKey("parent_profiles.id", ondelete="CASCADE"), nullable=False)
    student_id = db.Column(db.Integer, db.ForeignKey("student_profiles.id", ondelete="CASCADE"), nullable=False)
    relationship_type = db.Column(db.String(50), default="Parent")  # 'Father', 'Mother', 'Guardian'
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    parent = db.relationship("ParentProfile", back_populates="student_links")
    student = db.relationship("StudentProfile", back_populates="parent_links")

    def to_dict(self):
        return {
            "id": self.id,
            "parent_id": self.parent_id,
            "student_id": self.student_id,
            "relationship_type": self.relationship_type,
            "student": self.student.to_dict() if self.student else None,
        }
