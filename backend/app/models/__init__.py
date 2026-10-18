"""Models package exports for SmartAttend."""
from app.models.user import (
    User,
    StudentProfile,
    FacultyProfile,
    ParentProfile,
    ParentStudentRelationship,
)
from app.models.academic import (
    AcademicYear,
    Semester,
    Class,
    Subject,
    StudentEnrollment,
    FacultySubjectAssignment,
)
from app.models.timetable import TimetableEntry
from app.models.attendance import (
    AttendanceSession,
    AttendanceRecord,
    AttendanceCorrectionRequest,
)
from app.models.system import (
    Notification,
    AuditLog,
    TokenBlocklist,
    SystemSetting,
)

__all__ = [
    "User",
    "StudentProfile",
    "FacultyProfile",
    "ParentProfile",
    "ParentStudentRelationship",
    "AcademicYear",
    "Semester",
    "Class",
    "Subject",
    "StudentEnrollment",
    "FacultySubjectAssignment",
    "TimetableEntry",
    "AttendanceSession",
    "AttendanceRecord",
    "AttendanceCorrectionRequest",
    "Notification",
    "AuditLog",
    "TokenBlocklist",
    "SystemSetting",
]
