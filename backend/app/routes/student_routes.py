"""Student REST API routes: personal attendance summary, shortage calculator, history, and timetable."""
from datetime import datetime, date
from flask import Blueprint, request
from flask_jwt_extended import current_user
from app.extensions import db
from app.models.timetable import TimetableEntry
from app.models.attendance import AttendanceSession, AttendanceRecord, AttendanceCorrectionRequest
from app.services.attendance_service import AttendanceService
from app.utils.decorators import role_required
from app.utils.response import success_response, error_response

student_bp = Blueprint("student", __name__)


@student_bp.route("/dashboard", methods=["GET"])
@role_required("student")
def get_student_dashboard():
    """
    Returns personal attendance dashboard for the authenticated student.
    Never trusts client-supplied student ID; always uses current_user.student_profile.
    """
    profile = current_user.student_profile
    if not profile:
        return error_response(message="Student profile not found for this user account.", status_code=404)

    summary, err = AttendanceService.get_student_subject_wise_summary(profile.id)
    if err:
        return error_response(message=err, status_code=400)

    # Class timetable for today
    today = date.today()
    day_name = today.strftime("%A")
    today_lectures = []
    if profile.class_id:
        today_lectures = (
            TimetableEntry.query
            .filter_by(class_id=profile.class_id, day_of_week=day_name, is_active=True)
            .order_by(TimetableEntry.start_time.asc())
            .all()
        )

    # Recent attendance marks (last 10 records)
    recent_records = (
        AttendanceRecord.query
        .filter_by(student_id=profile.id)
        .join(AttendanceRecord.session)
        .order_by(AttendanceSession.lecture_date.desc(), AttendanceRecord.id.desc())
        .limit(10)
        .all()
    )

    recent_marks = []
    for r in recent_records:
        entry = r.session.timetable_entry
        recent_marks.append({
            "id": r.id,
            "date": r.session.lecture_date.isoformat(),
            "status": r.status,
            "subject_code": entry.subject.code if entry and entry.subject else "N/A",
            "subject_name": entry.subject.name if entry and entry.subject else "N/A",
            "faculty_name": entry.faculty.user.full_name if entry and entry.faculty and entry.faculty.user else "Faculty",
            "start_time": entry.start_time.strftime("%H:%M") if entry and entry.start_time else "",
            "end_time": entry.end_time.strftime("%H:%M") if entry and entry.end_time else "",
        })

    return success_response(
        data={
            "student": profile.to_dict(),
            "summary": summary,
            "today_lectures": [l.to_dict() for l in today_lectures],
            "recent_records": recent_marks,
        },
        message="Student dashboard loaded successfully."
    )


@student_bp.route("/attendance/summary", methods=["GET"])
@role_required("student")
def get_attendance_summary():
    """Returns subject-wise attendance breakdown and overall percentage."""
    profile = current_user.student_profile
    if not profile:
        return error_response(message="Student profile not found.", status_code=404)

    summary, err = AttendanceService.get_student_subject_wise_summary(profile.id)
    if err:
        return error_response(message=err, status_code=400)

    return success_response(data={"summary": summary})


@student_bp.route("/attendance/history", methods=["GET"])
@role_required("student")
def get_attendance_history():
    """
    Returns attendance history with optional filters for subject, status, and date range.
    """
    profile = current_user.student_profile
    if not profile:
        return error_response(message="Student profile not found.", status_code=404)

    subject_id = request.args.get("subject_id", type=int)
    status_filter = request.args.get("status")
    start_date_str = request.args.get("start_date")
    end_date_str = request.args.get("end_date")

    query = (
        AttendanceRecord.query
        .filter_by(student_id=profile.id)
        .join(AttendanceRecord.session)
        .join(AttendanceSession.timetable_entry)
        .filter(AttendanceSession.status == "FINALIZED")
    )

    if subject_id:
        query = query.filter(TimetableEntry.subject_id == subject_id)
    if status_filter:
        query = query.filter(AttendanceRecord.status == status_filter.upper())
    if start_date_str:
        try:
            s_date = datetime.strptime(start_date_str, "%Y-%m-%d").date()
            query = query.filter(AttendanceSession.lecture_date >= s_date)
        except ValueError:
            pass
    if end_date_str:
        try:
            e_date = datetime.strptime(end_date_str, "%Y-%m-%d").date()
            query = query.filter(AttendanceSession.lecture_date <= e_date)
        except ValueError:
            pass

    records = query.order_by(AttendanceSession.lecture_date.desc(), AttendanceRecord.id.desc()).all()

    result = []
    for r in records:
        entry = r.session.timetable_entry
        result.append({
            "id": r.id,
            "session_id": r.session_id,
            "date": r.session.lecture_date.isoformat(),
            "status": r.status,
            "subject_id": entry.subject_id if entry else None,
            "subject_code": entry.subject.code if entry and entry.subject else "N/A",
            "subject_name": entry.subject.name if entry and entry.subject else "N/A",
            "faculty_name": entry.faculty.user.full_name if entry and entry.faculty and entry.faculty.user else "Faculty",
            "start_time": entry.start_time.strftime("%H:%M") if entry and entry.start_time else "",
            "end_time": entry.end_time.strftime("%H:%M") if entry and entry.end_time else "",
            "room_number": entry.room_number if entry else "",
            "marked_at": r.marked_at.isoformat() if r.marked_at else "",
        })

    return success_response(
        data={"records": result, "total_records": len(result)},
        message="Attendance history retrieved successfully."
    )


@student_bp.route("/timetable", methods=["GET"])
@role_required("student")
def get_student_timetable():
    """Returns the weekly timetable for the student's enrolled class."""
    profile = current_user.student_profile
    if not profile or not profile.class_id:
        return error_response(message="Student is not assigned to any class.", status_code=400)

    entries = (
        TimetableEntry.query
        .filter_by(class_id=profile.class_id, is_active=True)
        .order_by(TimetableEntry.day_of_week, TimetableEntry.start_time)
        .all()
    )

    return success_response(
        data={"timetable": [e.to_dict() for e in entries]},
        message="Class timetable retrieved successfully."
    )


@student_bp.route("/shortage-calculator", methods=["GET"])
@role_required("student")
def calculate_attendance_shortage():
    """
    Calculates consecutive classes needed to reach target attendance percentage.
    Parameters: subject_id (optional), target_threshold (optional, default 75.0)
    """
    profile = current_user.student_profile
    if not profile:
        return error_response(message="Student profile not found.", status_code=404)

    target_threshold = request.args.get("target_threshold", default=75.0, type=float)
    subject_id = request.args.get("subject_id", type=int)

    summary, err = AttendanceService.get_student_subject_wise_summary(profile.id)
    if err:
        return error_response(message=err, status_code=400)

    if subject_id:
        # Calculate for specific subject
        sub_match = next((s for s in summary["subjects"] if s["subject_id"] == subject_id), None)
        if not sub_match:
            return error_response(message="Subject not found in student's academic record.", status_code=404)

        calc = AttendanceService.calculate_shortage(
            present=sub_match["present"],
            total=sub_match["conducted"],
            target_threshold=target_threshold
        )
        calc["subject_name"] = sub_match["subject_name"]
        calc["subject_code"] = sub_match["subject_code"]
        return success_response(data={"calculation": calc})

    # Overall calculation
    overall_calc = AttendanceService.calculate_shortage(
        present=summary["total_present"],
        total=summary["total_conducted"],
        target_threshold=target_threshold
    )
    return success_response(data={"calculation": overall_calc, "summary": summary})


@student_bp.route("/corrections", methods=["POST"])
@role_required("student")
def request_correction():
    """Allows student to submit an attendance correction request."""
    data = request.get_json() or {}
    session_id = data.get("session_id")
    requested_status = data.get("requested_status", "PRESENT")
    reason = (data.get("reason") or "").strip()

    if not session_id or not reason:
        return error_response(message="Session ID and reason are required.", status_code=400)

    profile = current_user.student_profile
    record = AttendanceRecord.query.filter_by(session_id=session_id, student_id=profile.id).first()
    if not record:
        return error_response(message="No attendance record found for this session.", status_code=404)

    correction = AttendanceCorrectionRequest(
        session_id=session_id,
        student_id=profile.id,
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
        message="Attendance correction request submitted to faculty and administration.",
        status_code=201
    )
