"""Admin REST API routes: academic management, timetable, users, and institution-wide analytics."""
import csv
import io
from datetime import datetime, date, timedelta
from flask import Blueprint, request, Response
from flask_jwt_extended import current_user
from sqlalchemy import func
from app.extensions import db
from app.models.user import User, StudentProfile, FacultyProfile, ParentProfile, ParentStudentRelationship
from app.models.academic import AcademicYear, Semester, Class, Subject, StudentEnrollment, FacultySubjectAssignment
from app.models.timetable import TimetableEntry
from app.models.attendance import AttendanceSession, AttendanceRecord, AttendanceCorrectionRequest
from app.models.system import AuditLog, SystemSetting
from app.services.audit_service import AuditService
from app.services.timetable_service import TimetableService
from app.utils.decorators import role_required
from app.utils.response import success_response, error_response
from app.utils.validators import validate_prn_email, validate_mitaoe_email
from flask import current_app

admin_bp = Blueprint("admin", __name__)


# ==========================================
# 1. ADMIN DASHBOARD & INSTITUTION ANALYTICS
# ==========================================

@admin_bp.route("/dashboard", methods=["GET"])
@role_required("admin")
def get_dashboard_stats():
    """Returns comprehensive calculated statistics for the administrator dashboard."""
    today = date.today()
    day_name = today.strftime("%A")

    # KPI counts
    total_students = StudentProfile.query.join(StudentProfile.user).filter(User.is_active == True).count()
    total_faculty = FacultyProfile.query.join(FacultyProfile.user).filter(User.is_active == True).count()
    total_classes = Class.query.count()
    total_subjects = Subject.query.filter_by(is_active=True).count()

    # Today's lectures
    today_scheduled_lectures = TimetableEntry.query.filter_by(day_of_week=day_name, is_active=True).count()
    today_finalized_sessions = AttendanceSession.query.filter_by(lecture_date=today, status="FINALIZED").count()

    # Overall institution attendance rate
    all_finalized_records = (
        AttendanceRecord.query
        .join(AttendanceRecord.session)
        .filter(AttendanceSession.status == "FINALIZED")
        .all()
    )
    total_records_count = len(all_finalized_records)
    total_present_count = sum(1 for r in all_finalized_records if r.status == "PRESENT")
    institution_attendance_pct = (
        round((total_present_count / total_records_count * 100), 2)
        if total_records_count > 0 else 100.0
    )

    # Students below 75% attendance threshold
    student_records_map = {}
    for r in all_finalized_records:
        if r.student_id not in student_records_map:
            student_records_map[r.student_id] = {"total": 0, "present": 0}
        student_records_map[r.student_id]["total"] += 1
        if r.status == "PRESENT":
            student_records_map[r.student_id]["present"] += 1

    low_attendance_students_count = 0
    for sid, counts in student_records_map.items():
        if counts["total"] > 0:
            pct = (counts["present"] / counts["total"]) * 100
            if pct < 75.0:
                low_attendance_students_count += 1

    # Daily trends (last 7 days)
    daily_trends = []
    for i in range(6, -1, -1):
        d = today - timedelta(days=i)
        sessions_on_date = AttendanceSession.query.filter_by(lecture_date=d, status="FINALIZED").all()
        day_records = [rec for s in sessions_on_date for rec in s.records]
        d_total = len(day_records)
        d_present = sum(1 for r in day_records if r.status == "PRESENT")
        d_pct = round((d_present / d_total * 100), 2) if d_total > 0 else 0.0

        daily_trends.append({
            "date": d.strftime("%b %d"),
            "full_date": d.isoformat(),
            "attendance_percentage": d_pct,
            "sessions_count": len(sessions_on_date),
            "total_marks": d_total,
        })

    # Class-wise attendance comparison
    classes = Class.query.all()
    class_stats = []
    for cls in classes:
        cls_records = (
            AttendanceRecord.query
            .join(AttendanceRecord.session)
            .join(AttendanceSession.timetable_entry)
            .filter(TimetableEntry.class_id == cls.id, AttendanceSession.status == "FINALIZED")
            .all()
        )
        c_tot = len(cls_records)
        c_pres = sum(1 for r in cls_records if r.status == "PRESENT")
        c_pct = round((c_pres / c_tot * 100), 2) if c_tot > 0 else 100.0
        class_stats.append({
            "class_id": cls.id,
            "class_name": f"{cls.code}-{cls.section}",
            "full_name": cls.name,
            "attendance_percentage": c_pct,
            "total_lectures": len(cls.timetable_entries),
        })

    # Subject-wise attendance
    subjects = Subject.query.filter_by(is_active=True).all()
    subject_stats = []
    for sub in subjects:
        sub_records = (
            AttendanceRecord.query
            .join(AttendanceRecord.session)
            .join(AttendanceSession.timetable_entry)
            .filter(TimetableEntry.subject_id == sub.id, AttendanceSession.status == "FINALIZED")
            .all()
        )
        s_tot = len(sub_records)
        s_pres = sum(1 for r in sub_records if r.status == "PRESENT")
        s_pct = round((s_pres / s_tot * 100), 2) if s_tot > 0 else 100.0
        subject_stats.append({
            "subject_id": sub.id,
            "subject_code": sub.code,
            "subject_name": sub.name,
            "attendance_percentage": s_pct,
        })

    # Recent Audit Activities
    recent_logs = (
        AuditLog.query
        .order_by(AuditLog.created_at.desc())
        .limit(10)
        .all()
    )

    return success_response(
        data={
            "kpi": {
                "total_students": total_students,
                "total_faculty": total_faculty,
                "total_classes": total_classes,
                "total_subjects": total_subjects,
                "today_scheduled_lectures": today_scheduled_lectures,
                "today_finalized_sessions": today_finalized_sessions,
                "institution_attendance_percentage": institution_attendance_pct,
                "low_attendance_students_count": low_attendance_students_count,
            },
            "daily_trends": daily_trends,
            "class_stats": class_stats,
            "subject_stats": subject_stats,
            "recent_activity": [log.to_dict() for log in recent_logs],
        },
        message="Admin dashboard statistics retrieved successfully.",
    )


# ==========================================
# 2. STUDENTS MANAGEMENT
# ==========================================

@admin_bp.route("/students", methods=["GET"])
@role_required("admin")
def list_students():
    """Lists students with optional class filter, search, and pagination."""
    class_id = request.args.get("class_id", type=int)
    search = (request.args.get("search") or "").strip()
    page = request.args.get("page", type=int)
    per_page = request.args.get("per_page", default=20, type=int)

    query = StudentProfile.query.join(StudentProfile.user)

    if class_id:
        query = query.filter(StudentProfile.class_id == class_id)

    if search:
        query = query.filter(
            (User.full_name.ilike(f"%{search}%")) |
            (User.email.ilike(f"%{search}%")) |
            (StudentProfile.roll_number.ilike(f"%{search}%")) |
            (StudentProfile.student_id.ilike(f"%{search}%"))
        )

    total_count = query.count()
    if page:
        paginated = query.order_by(StudentProfile.roll_number.asc()).paginate(page=page, per_page=per_page, error_out=False)
        return success_response(
            data={
                "students": [s.to_dict() for s in paginated.items],
                "pagination": {
                    "page": page,
                    "per_page": per_page,
                    "total": total_count,
                    "pages": paginated.pages,
                }
            },
            message=f"Found {total_count} students.",
        )

    students = query.order_by(StudentProfile.roll_number.asc()).all()
    return success_response(
        data={"students": [s.to_dict() for s in students]},
        message=f"Found {len(students)} students.",
    )


@admin_bp.route("/students", methods=["POST"])
@role_required("admin")
def create_student():
    """Creates a new student user and linked StudentProfile."""
    data = request.get_json() or {}
    full_name = data.get("full_name")
    email = (data.get("email") or "").strip().lower()
    password = (data.get("password") or "").strip()
    student_id = (data.get("student_id") or "").strip()
    roll_number = (data.get("roll_number") or "").strip()
    class_id = data.get("class_id")

    is_testing = current_app.config.get("TESTING", False)
    is_prn_valid, prn = validate_prn_email(email, is_testing=is_testing)
    if not is_prn_valid:
        return error_response(
            message="Student email must match the 12-digit PRN format: e.g. 202501100063@mitaoe.ac.in",
            status_code=400,
        )

    if not student_id:
        student_id = prn
    if not roll_number:
        roll_number = prn

    if not full_name or not email or not student_id or not roll_number or not password:
        return error_response(message="Full name, email, student ID, roll number, and password are required.", status_code=400)

    # Check email uniqueness
    if User.query.filter(User.email.ilike(email)).first():
        return error_response(message=f"An account with email '{email}' already exists.", status_code=409)

    # Check student_id uniqueness
    if StudentProfile.query.filter_by(student_id=student_id).first():
        return error_response(message=f"Student ID / PRN '{student_id}' is already assigned.", status_code=409)

    try:
        user = User(
            full_name=full_name,
            email=email,
            username=student_id.lower(),
            role="student",
            is_active=True,
        )
        user.set_password(password)
        db.session.add(user)
        db.session.flush()

        profile = StudentProfile(
            user_id=user.id,
            student_id=student_id,
            roll_number=roll_number,
            class_id=class_id,
            admission_date=date.today(),
        )
        db.session.add(profile)
        db.session.commit()

        AuditService.log(
            action="STUDENT_CREATED",
            user_id=current_user.id,
            entity_type="StudentProfile",
            entity_id=profile.id,
            details={"email": email, "student_id": student_id, "roll_number": roll_number},
        )

        return success_response(data={"student": profile.to_dict()}, message="Student created successfully.", status_code=201)
    except Exception as e:
        db.session.rollback()
        return error_response(message=f"Error creating student: {str(e)}", status_code=500)


@admin_bp.route("/students/<int:id>", methods=["PUT"])
@role_required("admin")
def update_student(id):
    """Updates an existing student profile."""
    profile = StudentProfile.query.get(id)
    if not profile:
        return error_response(message="Student profile not found", status_code=404)

    data = request.get_json() or {}
    if "full_name" in data and profile.user:
        profile.user.full_name = data["full_name"]
    if "roll_number" in data:
        profile.roll_number = data["roll_number"]
    if "class_id" in data:
        profile.class_id = data["class_id"]
    if "is_active" in data and profile.user:
        profile.user.is_active = bool(data["is_active"])

    db.session.commit()
    return success_response(data={"student": profile.to_dict()}, message="Student updated successfully.")


@admin_bp.route("/students/<int:id>", methods=["DELETE"])
@role_required("admin")
def delete_student(id):
    """Deactivates a student account safely."""
    profile = StudentProfile.query.get(id)
    if not profile:
        return error_response(message="Student profile not found", status_code=404)

    if profile.user:
        profile.user.is_active = False
        db.session.commit()

    AuditService.log(
        action="STUDENT_DEACTIVATED",
        user_id=current_user.id,
        entity_type="StudentProfile",
        entity_id=id,
    )
    return success_response(message="Student account deactivated successfully.")


# ==========================================
# 3. FACULTY MANAGEMENT
# ==========================================

@admin_bp.route("/faculty", methods=["GET"])
@role_required("admin")
def list_faculty():
    """Lists all faculty members with optional search and pagination."""
    search = (request.args.get("search") or "").strip()
    page = request.args.get("page", type=int)
    per_page = request.args.get("per_page", default=20, type=int)

    query = FacultyProfile.query.join(FacultyProfile.user)

    if search:
        query = query.filter(
            (User.full_name.ilike(f"%{search}%")) |
            (User.email.ilike(f"%{search}%")) |
            (FacultyProfile.faculty_id.ilike(f"%{search}%")) |
            (FacultyProfile.department.ilike(f"%{search}%"))
        )

    total_count = query.count()
    if page:
        paginated = query.order_by(User.full_name.asc()).paginate(page=page, per_page=per_page, error_out=False)
        return success_response(
            data={
                "faculty": [f.to_dict() for f in paginated.items],
                "pagination": {
                    "page": page,
                    "per_page": per_page,
                    "total": total_count,
                    "pages": paginated.pages,
                }
            },
            message="Faculty list retrieved successfully.",
        )

    faculty_list = query.order_by(User.full_name.asc()).all()
    return success_response(
        data={"faculty": [f.to_dict() for f in faculty_list]},
        message="Faculty list retrieved successfully.",
    )


@admin_bp.route("/faculty", methods=["POST"])
@role_required("admin")
def create_faculty():
    """Creates a new faculty member account."""
    data = request.get_json() or {}
    full_name = data.get("full_name")
    email = (data.get("email") or "").strip().lower()
    faculty_id = (data.get("faculty_id") or "").strip()
    department = (data.get("department") or "Computer Science").strip()
    designation = (data.get("designation") or "Assistant Professor").strip()
    phone = data.get("phone", "")
    password = (data.get("password") or "").strip()

    if not full_name or not email or not faculty_id or not password:
        return error_response(message="Full name, email, faculty ID, and password are required.", status_code=400)

    is_testing = current_app.config.get("TESTING", False)
    if not validate_mitaoe_email(email, is_testing=is_testing):
        return error_response(message="Faculty email must belong to the @mitaoe.ac.in institutional domain.", status_code=400)

    if User.query.filter(User.email.ilike(email)).first():
        return error_response(message=f"An account with email '{email}' already exists.", status_code=409)

    if FacultyProfile.query.filter_by(faculty_id=faculty_id).first():
        return error_response(message=f"Faculty ID '{faculty_id}' is already registered.", status_code=409)

    try:
        user = User(
            full_name=full_name,
            email=email,
            username=faculty_id.lower(),
            role="faculty",
            is_active=True,
        )
        user.set_password(password)
        db.session.add(user)
        db.session.flush()

        faculty = FacultyProfile(
            user_id=user.id,
            faculty_id=faculty_id,
            department=department,
            designation=designation,
            phone=phone,
        )
        db.session.add(faculty)
        db.session.commit()

        AuditService.log(
            action="FACULTY_CREATED",
            user_id=current_user.id,
            entity_type="FacultyProfile",
            entity_id=faculty.id,
            details={"email": email, "faculty_id": faculty_id},
        )

        return success_response(data={"faculty": faculty.to_dict()}, message="Faculty member created successfully.", status_code=201)
    except Exception as e:
        db.session.rollback()
        return error_response(message=f"Error creating faculty: {str(e)}", status_code=500)


@admin_bp.route("/faculty/<int:id>", methods=["PUT"])
@role_required("admin")
def update_faculty(id):
    """Updates faculty details."""
    faculty = FacultyProfile.query.get(id)
    if not faculty:
        return error_response(message="Faculty not found", status_code=404)

    data = request.get_json() or {}
    if "full_name" in data and faculty.user:
        faculty.user.full_name = data["full_name"]
    if "department" in data:
        faculty.department = data["department"]
    if "designation" in data:
        faculty.designation = data["designation"]
    if "phone" in data:
        faculty.phone = data["phone"]
    if "is_active" in data and faculty.user:
        faculty.user.is_active = bool(data["is_active"])

    db.session.commit()
    return success_response(data={"faculty": faculty.to_dict()}, message="Faculty updated successfully.")


# ==========================================
# 4. CLASSES & SUBJECTS MANAGEMENT
# ==========================================

@admin_bp.route("/classes", methods=["GET"])
@role_required("admin")
def list_classes():
    """Lists all classes and sections."""
    classes = Class.query.order_by(Class.code.asc(), Class.section.asc()).all()
    return success_response(
        data={"classes": [c.to_dict() for c in classes]},
        message="Classes retrieved successfully.",
    )


@admin_bp.route("/classes", methods=["POST"])
@role_required("admin")
def create_class():
    """Creates a new class and section."""
    data = request.get_json() or {}
    name = (data.get("name") or "").strip()
    code = (data.get("code") or "").strip()
    section = (data.get("section") or "A").strip()
    capacity = data.get("capacity", 60)

    if not name or not code:
        return error_response(message="Class name and code are required.", status_code=400)

    cls = Class(name=name, code=code, section=section, capacity=capacity)
    db.session.add(cls)
    db.session.commit()
    return success_response(data={"class": cls.to_dict()}, message="Class created successfully.", status_code=201)


@admin_bp.route("/subjects", methods=["GET"])
@role_required("admin")
def list_subjects():
    """Lists all subjects."""
    subjects = Subject.query.order_by(Subject.code.asc()).all()
    return success_response(
        data={"subjects": [s.to_dict() for s in subjects]},
        message="Subjects retrieved successfully.",
    )


@admin_bp.route("/subjects", methods=["POST"])
@role_required("admin")
def create_subject():
    """Creates a new subject."""
    data = request.get_json() or {}
    code = (data.get("code") or "").strip()
    name = (data.get("name") or "").strip()
    description = data.get("description", "")
    credits = data.get("credits", 3)

    if not code or not name:
        return error_response(message="Subject code and name are required.", status_code=400)

    sub = Subject(code=code, name=name, description=description, credits=credits, is_active=True)
    db.session.add(sub)
    db.session.commit()
    return success_response(data={"subject": sub.to_dict()}, message="Subject created successfully.", status_code=201)


# ==========================================
# 5. FACULTY-SUBJECT ASSIGNMENTS
# ==========================================

@admin_bp.route("/assignments", methods=["GET"])
@role_required("admin")
def list_assignments():
    """Lists faculty-subject-class assignments."""
    assignments = FacultySubjectAssignment.query.filter_by(is_active=True).all()
    return success_response(
        data={"assignments": [a.to_dict() for a in assignments]},
        message="Assignments retrieved successfully.",
    )


@admin_bp.route("/assignments", methods=["POST"])
@role_required("admin")
def create_assignment():
    """Assigns a faculty member to teach a subject to a class."""
    data = request.get_json() or {}
    faculty_id = data.get("faculty_id")
    subject_id = data.get("subject_id")
    class_id = data.get("class_id")

    if not faculty_id or not subject_id or not class_id:
        return error_response(message="Faculty ID, Subject ID, and Class ID are required.", status_code=400)

    # Get active academic year
    ay = AcademicYear.query.filter_by(is_current=True).first()
    ay_id = ay.id if ay else 1

    assignment = FacultySubjectAssignment(
        faculty_id=faculty_id,
        subject_id=subject_id,
        class_id=class_id,
        academic_year_id=ay_id,
        is_active=True,
    )
    db.session.add(assignment)
    db.session.commit()

    return success_response(data={"assignment": assignment.to_dict()}, message="Assignment created successfully.", status_code=201)


# ==========================================
# 6. TIMETABLE MANAGEMENT & CONFLICT CHECKING
# ==========================================

@admin_bp.route("/timetable", methods=["GET"])
@role_required("admin")
def list_timetable():
    """Lists timetable entries with optional filtering by class, faculty, or day."""
    class_id = request.args.get("class_id", type=int)
    faculty_id = request.args.get("faculty_id", type=int)
    day = request.args.get("day")

    query = TimetableEntry.query.filter_by(is_active=True)

    if class_id:
        query = query.filter_by(class_id=class_id)
    if faculty_id:
        query = query.filter_by(faculty_id=faculty_id)
    if day:
        query = query.filter_by(day_of_week=day)

    entries = query.order_by(TimetableEntry.day_of_week, TimetableEntry.start_time).all()
    return success_response(
        data={"timetable": [e.to_dict() for e in entries]},
        message="Timetable entries retrieved successfully.",
    )


@admin_bp.route("/timetable", methods=["POST"])
@role_required("admin")
def create_timetable_entry():
    """Creates a new timetable entry after checking for class, faculty, and room conflicts."""
    data = request.get_json() or {}
    class_id = data.get("class_id")
    subject_id = data.get("subject_id")
    faculty_id = data.get("faculty_id")
    day_of_week = data.get("day_of_week")
    start_time_str = data.get("start_time")
    end_time_str = data.get("end_time")
    room_number = data.get("room_number")

    if not all([class_id, subject_id, faculty_id, day_of_week, start_time_str, end_time_str]):
        return error_response(message="Class, Subject, Faculty, Day, Start Time, and End Time are required.", status_code=400)

    # Validate conflicts
    valid, conflict_msg = TimetableService.check_conflict(
        day_of_week=day_of_week,
        start_time_val=start_time_str,
        end_time_val=end_time_str,
        class_id=class_id,
        faculty_id=faculty_id,
        room_number=room_number,
    )
    if not valid:
        return error_response(message=conflict_msg, error_code="TIMETABLE_CONFLICT", status_code=409)

    start = TimetableService.parse_time(start_time_str)
    end = TimetableService.parse_time(end_time_str)

    entry = TimetableEntry(
        class_id=class_id,
        subject_id=subject_id,
        faculty_id=faculty_id,
        day_of_week=day_of_week,
        start_time=start,
        end_time=end,
        room_number=room_number,
        is_active=True,
    )
    db.session.add(entry)
    db.session.commit()

    AuditService.log(
        action="TIMETABLE_ENTRY_CREATED",
        user_id=current_user.id,
        entity_type="TimetableEntry",
        entity_id=entry.id,
        details={"day": day_of_week, "class_id": class_id, "faculty_id": faculty_id, "time": f"{start_time_str}-{end_time_str}"},
    )

    return success_response(data={"entry": entry.to_dict()}, message="Timetable lecture created successfully.", status_code=201)


@admin_bp.route("/timetable/<int:id>", methods=["DELETE"])
@role_required("admin")
def deactivate_timetable_entry(id):
    """Deactivates a timetable entry without losing historical attendance records."""
    entry = TimetableEntry.query.get(id)
    if not entry:
        return error_response(message="Timetable entry not found", status_code=404)

    entry.is_active = False
    db.session.commit()
    return success_response(message="Timetable entry deactivated successfully.")


@admin_bp.route("/timetable/<int:id>", methods=["PUT"])
@role_required("admin")
def update_timetable_entry(id):
    """Updates an existing timetable entry with full conflict validation."""
    entry = TimetableEntry.query.get(id)
    if not entry:
        return error_response(message="Timetable entry not found.", status_code=404)

    data = request.get_json() or {}
    class_id = data.get("class_id", entry.class_id)
    subject_id = data.get("subject_id", entry.subject_id)
    faculty_id = data.get("faculty_id", entry.faculty_id)
    day_of_week = data.get("day_of_week", entry.day_of_week)
    start_time_str = data.get("start_time", entry.start_time.strftime("%H:%M") if entry.start_time else None)
    end_time_str = data.get("end_time", entry.end_time.strftime("%H:%M") if entry.end_time else None)
    room_number = data.get("room_number", entry.room_number)

    valid, conflict_msg = TimetableService.check_conflict(
        day_of_week=day_of_week,
        start_time_val=start_time_str,
        end_time_val=end_time_str,
        class_id=class_id,
        faculty_id=faculty_id,
        room_number=room_number,
        exclude_entry_id=entry.id,
    )
    if not valid:
        return error_response(message=conflict_msg, error_code="TIMETABLE_CONFLICT", status_code=409)

    entry.class_id = class_id
    entry.subject_id = subject_id
    entry.faculty_id = faculty_id
    entry.day_of_week = day_of_week
    entry.start_time = TimetableService.parse_time(start_time_str)
    entry.end_time = TimetableService.parse_time(end_time_str)
    entry.room_number = room_number
    if "status" in data:
        entry.status = data["status"]
    if "is_active" in data:
        entry.is_active = bool(data["is_active"])

    db.session.commit()

    AuditService.log(
        action="TIMETABLE_ENTRY_UPDATED",
        user_id=current_user.id,
        entity_type="TimetableEntry",
        entity_id=entry.id,
        details={"day": day_of_week, "class_id": class_id, "faculty_id": faculty_id},
    )

    return success_response(data={"entry": entry.to_dict()}, message="Timetable lecture updated successfully.")


@admin_bp.route("/timetable/check-conflict", methods=["POST"])
@role_required("admin")
def check_timetable_conflict():
    """Validates conflict for prospective timetable slot without committing."""
    data = request.get_json() or {}
    class_id = data.get("class_id")
    faculty_id = data.get("faculty_id")
    day_of_week = data.get("day_of_week")
    start_time_str = data.get("start_time")
    end_time_str = data.get("end_time")
    room_number = data.get("room_number")
    exclude_entry_id = data.get("exclude_entry_id")

    if not all([class_id, faculty_id, day_of_week, start_time_str, end_time_str]):
        return error_response(message="Class, Faculty, Day, Start Time, and End Time are required.", status_code=400)

    valid, conflict_msg = TimetableService.check_conflict(
        day_of_week=day_of_week,
        start_time_val=start_time_str,
        end_time_val=end_time_str,
        class_id=class_id,
        faculty_id=faculty_id,
        room_number=room_number,
        exclude_entry_id=exclude_entry_id,
    )
    return success_response(
        data={"has_conflict": not valid, "conflict_message": conflict_msg},
        message="Conflict evaluation completed.",
    )


@admin_bp.route("/timetable/generate", methods=["POST"])
@role_required("admin")
def generate_class_timetable():
    """Generates a complete, conflict-free timetable for a class using constraint scheduling."""
    data = request.get_json() or {}
    class_id = data.get("class_id")
    default_room = data.get("room_number", "Room 101")
    save_as_draft = bool(data.get("save_as_draft", False))

    if not class_id:
        return error_response(message="Class ID is required.", status_code=400)

    entries, err = TimetableService.generate_timetable(
        class_id=class_id,
        default_room=default_room,
        save_as_draft=save_as_draft,
    )
    if err:
        return error_response(message=err, status_code=400)

    AuditService.log(
        action="TIMETABLE_AUTO_GENERATED",
        user_id=current_user.id,
        entity_type="Class",
        entity_id=class_id,
        details={"entries_count": len(entries), "is_draft": save_as_draft},
    )

    return success_response(
        data={"generated_entries": [e.to_dict() for e in entries], "count": len(entries)},
        message=f"Successfully generated {len(entries)} conflict-free lectures.",
        status_code=201,
    )


# ==========================================
# 7. ATTENDANCE SESSIONS & CSV EXPORT
# ==========================================

@admin_bp.route("/attendance/sessions", methods=["GET"])
@role_required("admin")
def list_attendance_sessions():
    """Lists finalized attendance sessions with filters."""
    class_id = request.args.get("class_id", type=int)
    subject_id = request.args.get("subject_id", type=int)
    date_str = request.args.get("date")

    query = AttendanceSession.query.join(AttendanceSession.timetable_entry)

    if class_id:
        query = query.filter(TimetableEntry.class_id == class_id)
    if subject_id:
        query = query.filter(TimetableEntry.subject_id == subject_id)
    if date_str:
        try:
            target_date = datetime.strptime(date_str, "%Y-%m-%d").date()
            query = query.filter(AttendanceSession.lecture_date == target_date)
        except ValueError:
            pass

    sessions = query.order_by(AttendanceSession.lecture_date.desc(), AttendanceSession.id.desc()).limit(100).all()
    return success_response(
        data={"sessions": [s.to_dict() for s in sessions]},
        message="Attendance sessions retrieved successfully.",
    )


@admin_bp.route("/attendance/export-csv", methods=["GET"])
@role_required("admin")
def export_attendance_csv():
    """Exports attendance report as CSV."""
    records = (
        AttendanceRecord.query
        .join(AttendanceRecord.session)
        .join(AttendanceSession.timetable_entry)
        .order_by(AttendanceSession.lecture_date.desc())
        .limit(1000)
        .all()
    )

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Date", "Subject Code", "Subject Name", "Class", "Section", "Roll Number", "Student Name", "Status", "Marked At"])

    for r in records:
        s = r.session
        entry = s.timetable_entry if s else None
        writer.writerow([
            s.lecture_date.isoformat() if s else "",
            entry.subject.code if entry and entry.subject else "",
            entry.subject.name if entry and entry.subject else "",
            entry.class_ref.code if entry and entry.class_ref else "",
            entry.class_ref.section if entry and entry.class_ref else "",
            r.student.roll_number if r.student else "",
            r.student.user.full_name if r.student and r.student.user else "",
            r.status,
            r.marked_at.isoformat() if r.marked_at else "",
        ])

    csv_data = output.getvalue()
    return Response(
        csv_data,
        mimetype="text/csv",
        headers={"Content-Disposition": "attachment; filename=smartattend_report.csv"}
    )


# ==========================================
# 8. AUDIT LOGS & SETTINGS
# ==========================================

@admin_bp.route("/audit-logs", methods=["GET"])
@role_required("admin")
def list_audit_logs():
    """Lists audit logs."""
    logs = AuditLog.query.order_by(AuditLog.created_at.desc()).limit(100).all()
    return success_response(data={"logs": [l.to_dict() for l in logs]})


@admin_bp.route("/settings", methods=["GET"])
@role_required("admin")
def list_settings():
    """Lists system settings."""
    settings = SystemSetting.query.all()
    return success_response(data={"settings": [s.to_dict() for s in settings]})


@admin_bp.route("/settings", methods=["PUT"])
@role_required("admin")
def update_setting():
    """Updates a system setting."""
    data = request.get_json() or {}
    key = data.get("key")
    value = data.get("value")

    if not key or value is None:
        return error_response(message="Key and value are required.", status_code=400)

    setting = SystemSetting.query.filter_by(key=key).first()
    if not setting:
        setting = SystemSetting(key=key, value=str(value))
        db.session.add(setting)
    else:
        setting.value = str(value)

    db.session.commit()
    return success_response(data={"setting": setting.to_dict()}, message="Setting saved successfully.")


# ==========================================
# 9. ATTENDANCE ANALYTICS: LOW-ATTENDANCE LIST
# ==========================================

@admin_bp.route("/analytics/low-attendance", methods=["GET"])
@role_required("admin")
def get_low_attendance_students():
    """
    Returns dedicated list of students whose overall attendance is below a threshold.
    Default threshold is 75%, configurable via query param threshold.
    """
    threshold = request.args.get("threshold", default=75.0, type=float)
    class_id = request.args.get("class_id", type=int)

    all_finalized_records = (
        AttendanceRecord.query
        .join(AttendanceRecord.session)
        .filter(AttendanceSession.status == "FINALIZED")
        .all()
    )
    student_records_map = {}
    for r in all_finalized_records:
        if r.student_id not in student_records_map:
            student_records_map[r.student_id] = {"total": 0, "present": 0}
        student_records_map[r.student_id]["total"] += 1
        if r.status == "PRESENT":
            student_records_map[r.student_id]["present"] += 1

    low_attendance_list = []
    for sid, counts in student_records_map.items():
        if counts["total"] > 0:
            pct = round((counts["present"] / counts["total"]) * 100, 2)
            if pct < threshold:
                student = StudentProfile.query.get(sid)
                if not student or not student.user or not student.user.is_active:
                    continue
                if class_id and student.class_id != class_id:
                    continue

                parent_info = []
                for link in student.parent_links:
                    if link.parent and link.parent.user:
                        parent_info.append({
                            "name": link.parent.user.full_name,
                            "email": link.parent.user.email,
                            "relationship": link.relationship_type,
                        })

                low_attendance_list.append({
                    "student_id": student.id,
                    "student_code": student.student_id,
                    "roll_number": student.roll_number,
                    "full_name": student.user.full_name,
                    "email": student.user.email,
                    "class_name": student.current_class.name if student.current_class else None,
                    "class_code": student.current_class.code if student.current_class else None,
                    "total_lectures": counts["total"],
                    "attended_lectures": counts["present"],
                    "attendance_percentage": pct,
                    "parents": parent_info,
                })

    low_attendance_list.sort(key=lambda x: x["attendance_percentage"])
    return success_response(
        data={"low_attendance_students": low_attendance_list, "threshold": threshold},
        message=f"Found {len(low_attendance_list)} students with attendance below {threshold}%.",
    )
