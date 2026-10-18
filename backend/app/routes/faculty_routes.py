"""Faculty REST API routes: timetable, absent-first attendance taking, student rosters, and history."""
from datetime import datetime, date
from flask import Blueprint, request
from flask_jwt_extended import current_user
from app.extensions import db
from app.models.timetable import TimetableEntry
from app.models.attendance import AttendanceSession, AttendanceRecord, AttendanceCorrectionRequest
from app.services.attendance_service import AttendanceService
from app.utils.decorators import role_required
from app.utils.response import success_response, error_response

faculty_bp = Blueprint("faculty", __name__)


@faculty_bp.route("/dashboard", methods=["GET"])
@role_required("faculty")
def get_faculty_dashboard():
    """Returns overview statistics and today's schedule for the authenticated faculty member."""
    faculty = current_user.faculty_profile
    if not faculty:
        return error_response(message="Faculty profile not found for this user.", status_code=404)

    today = date.today()
    day_name = today.strftime("%A")

    # Fetch today's lectures for this faculty
    today_lectures = (
        TimetableEntry.query
        .filter_by(faculty_id=faculty.id, day_of_week=day_name, is_active=True)
        .order_by(TimetableEntry.start_time.asc())
        .all()
    )

    lectures_data = []
    for lec in today_lectures:
        # Check if attendance is already taken today
        existing_session = AttendanceSession.query.filter_by(
            timetable_entry_id=lec.id,
            lecture_date=today
        ).first()

        lec_dict = lec.to_dict()
        lec_dict["attendance_submitted"] = bool(existing_session)
        lec_dict["session_id"] = existing_session.id if existing_session else None
        lec_dict["session_status"] = existing_session.status if existing_session else "PENDING"
        lectures_data.append(lec_dict)

    # Assigned subjects count
    assignments_count = len(faculty.subject_assignments)
    total_conducted = (
        AttendanceSession.query
        .join(AttendanceSession.timetable_entry)
        .filter(TimetableEntry.faculty_id == faculty.id, AttendanceSession.status == "FINALIZED")
        .count()
    )

    return success_response(
        data={
            "faculty": faculty.to_dict(),
            "today_date": today.isoformat(),
            "today_day": day_name,
            "today_lectures": lectures_data,
            "stats": {
                "assigned_subjects": assignments_count,
                "total_conducted_sessions": total_conducted,
                "today_lectures_count": len(today_lectures),
            }
        },
        message="Faculty dashboard loaded successfully."
    )


@faculty_bp.route("/timetable", methods=["GET"])
@role_required("faculty")
def get_faculty_timetable():
    """
    Returns the personal weekly timetable for the authenticated faculty member.
    Faculty A cannot see Faculty B's timetable.
    """
    faculty = current_user.faculty_profile
    if not faculty:
        return error_response(message="Faculty profile not found.", status_code=404)

    today = date.today()
    entries = (
        TimetableEntry.query
        .filter_by(faculty_id=faculty.id, is_active=True)
        .order_by(TimetableEntry.day_of_week, TimetableEntry.start_time)
        .all()
    )

    result = []
    for entry in entries:
        item = entry.to_dict()
        # Check if today is the day and whether session was submitted
        if entry.day_of_week == today.strftime("%A"):
            session = AttendanceSession.query.filter_by(
                timetable_entry_id=entry.id,
                lecture_date=today
            ).first()
            item["attendance_taken_today"] = bool(session)
            item["session_id"] = session.id if session else None
        else:
            item["attendance_taken_today"] = False
            item["session_id"] = None
        result.append(item)

    return success_response(
        data={"timetable": result},
        message="Personal timetable retrieved successfully."
    )


@faculty_bp.route("/lectures/<int:id>/students", methods=["GET"])
@role_required("faculty")
def get_lecture_students(id):
    """
    Loads the roster of eligible enrolled students for an attendance session.
    Validates faculty authorization.
    If attendance was already taken today, returns saved attendance statuses.
    """
    faculty = current_user.faculty_profile
    if not faculty:
        return error_response(message="Faculty profile not found.", status_code=404)

    entry = TimetableEntry.query.get(id)
    if not entry:
        return error_response(message="Timetable entry not found.", status_code=404)

    # Permission check: verify this lecture is assigned to this faculty
    if entry.faculty_id != faculty.id:
        return error_response(
            message="Unauthorized: You are not assigned to conduct this lecture.",
            error_code="FORBIDDEN_LECTURE",
            status_code=403
        )

    target_date_str = request.args.get("date") or date.today().isoformat()
    try:
        target_date = datetime.strptime(target_date_str, "%Y-%m-%d").date()
    except ValueError:
        target_date = date.today()

    # Check if attendance is already finalized for this lecture and date
    existing_session = AttendanceSession.query.filter_by(
        timetable_entry_id=entry.id,
        lecture_date=target_date
    ).first()

    # Fetch eligible enrolled students
    students, err = AttendanceService.get_eligible_students_for_lecture(entry.id)
    if err:
        return error_response(message=err, status_code=400)

    # Build student attendance list
    # If already submitted, pre-populate saved status
    saved_records_map = {}
    if existing_session:
        for r in existing_session.records:
            saved_records_map[r.student_id] = r.status

    student_list = []
    for s in students:
        is_already_absent = (saved_records_map.get(s.id) == "ABSENT")
        student_list.append({
            "student_profile_id": s.id,
            "roll_number": s.roll_number,
            "student_id": s.student_id,
            "full_name": s.user.full_name,
            "email": s.user.email,
            # Absent-first workflow: default is Present (absent = False)
            "is_absent": is_already_absent,
            "saved_status": saved_records_map.get(s.id, "PRESENT"),
        })

    return success_response(
        data={
            "lecture": entry.to_dict(),
            "date": target_date.isoformat(),
            "is_already_submitted": bool(existing_session),
            "session_id": existing_session.id if existing_session else None,
            "session_status": existing_session.status if existing_session else None,
            "students": student_list,
            "total_students": len(student_list),
        },
        message="Class roster loaded successfully."
    )


@faculty_bp.route("/lectures/<int:id>/attendance", methods=["POST"])
@role_required("faculty")
def submit_attendance(id):
    """
    Submits absent-first attendance for a scheduled lecture.
    Request body: { "date": "YYYY-MM-DD", "absent_student_ids": [1, 2, ...], "notes": "..." }
    """
    data = request.get_json() or {}
    lecture_date = data.get("date") or date.today().isoformat()
    absent_ids = data.get("absent_student_ids", [])
    notes = data.get("notes")

    # Delegate to transactional AttendanceService
    result, error_msg, status_code = AttendanceService.submit_absent_first_attendance(
        faculty_user_id=current_user.id,
        timetable_entry_id=id,
        lecture_date_str=lecture_date,
        absent_student_ids=absent_ids,
        notes=notes,
        is_admin=(current_user.role == "admin"),
    )

    if error_msg:
        return error_response(message=error_msg, status_code=status_code)

    return success_response(
        data={"attendance_session": result},
        message="Attendance recorded and finalized successfully.",
        status_code=201
    )


@faculty_bp.route("/lectures/<int:id>/attendance", methods=["GET"])
@role_required("faculty")
def get_lecture_attendance(id):
    """Retrieves finalized attendance details for a specific lecture date."""
    entry = TimetableEntry.query.get(id)
    if not entry:
        return error_response(message="Timetable entry not found.", status_code=404)

    target_date_str = request.args.get("date") or date.today().isoformat()
    try:
        target_date = datetime.strptime(target_date_str, "%Y-%m-%d").date()
    except ValueError:
        target_date = date.today()

    session = AttendanceSession.query.filter_by(
        timetable_entry_id=id,
        lecture_date=target_date
    ).first()

    if not session:
        return error_response(message="No attendance session found for this lecture on this date.", status_code=404)

    return success_response(data={"session": session.to_dict(include_records=True)})


@faculty_bp.route("/attendance-corrections", methods=["POST"])
@role_required("faculty")
def request_attendance_correction():
    """Submits a request to correct an already finalized attendance record."""
    data = request.get_json() or {}
    session_id = data.get("session_id")
    student_id = data.get("student_id")
    requested_status = data.get("requested_status")
    reason = (data.get("reason") or "").strip()

    if not all([session_id, student_id, requested_status, reason]):
        return error_response(message="Session ID, Student ID, Requested Status, and Reason are required.", status_code=400)

    # Check record exists
    record = AttendanceRecord.query.filter_by(session_id=session_id, student_id=student_id).first()
    if not record:
        return error_response(message="Attendance record not found.", status_code=404)

    correction = AttendanceCorrectionRequest(
        session_id=session_id,
        student_id=student_id,
        requested_by_id=current_user.id,
        current_status=record.status,
        requested_status=requested_status,
        reason=reason,
        status="PENDING",
    )
    db.session.add(correction)
    db.session.commit()

    return success_response(
        data={"correction_request": correction.to_dict()},
        message="Attendance revision request submitted to administration for review.",
        status_code=201
    )


@faculty_bp.route("/history", methods=["GET"])
@role_required("faculty")
def get_faculty_history():
    """Returns list of past attendance sessions finalized by this faculty member."""
    sessions = (
        AttendanceSession.query
        .join(AttendanceSession.timetable_entry)
        .filter(TimetableEntry.faculty_id == current_user.faculty_profile.id)
        .order_by(AttendanceSession.lecture_date.desc(), AttendanceSession.id.desc())
        .limit(100)
        .all()
    )
    return success_response(
        data={"sessions": [s.to_dict() for s in sessions]},
        message="Faculty attendance history retrieved successfully."
    )
