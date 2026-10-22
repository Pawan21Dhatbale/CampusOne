"""Faculty REST API routes: timetable, absent-first attendance taking, student rosters, and history."""
from datetime import datetime, date
from flask import Blueprint, request
from flask_jwt_extended import current_user
from app.extensions import db
from app.models.timetable import TimetableEntry, LectureSwap
from app.models.attendance import AttendanceSession, AttendanceRecord, AttendanceCorrectionRequest
from app.models.user import User, FacultyProfile
from app.models.academic import Class, Subject, AcademicYear
from app.services.attendance_service import AttendanceService
from app.services.notification_service import NotificationService
from app.services.audit_service import AuditService
from app.services.timetable_service import TimetableService
from app.utils.csv_helper import parse_csv_input, get_field_val
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

    # Fetch today's regular scheduled lectures for this faculty
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
        lec_dict["is_substituted"] = False

        # Check if this lecture has been swapped away to another faculty today
        swap_away = LectureSwap.query.filter_by(
            timetable_entry_id=lec.id,
            requesting_faculty_id=faculty.id,
            target_date=today,
            status="ACCEPTED"
        ).first()
        if swap_away:
            lec_dict["is_swapped_away"] = True
            lec_dict["swap_id"] = swap_away.id
            sub_user = swap_away.substitute_faculty.user if swap_away.substitute_faculty else None
            lec_dict["substitute_faculty_name"] = sub_user.full_name if sub_user else "Colleague"
        else:
            lec_dict["is_swapped_away"] = False

        lectures_data.append(lec_dict)

    # Also fetch lectures where this faculty is acting as the ACCEPTED substitute today
    substitutions_today = LectureSwap.query.filter_by(
        substitute_faculty_id=faculty.id,
        target_date=today,
        status="ACCEPTED"
    ).all()

    for sub in substitutions_today:
        lec = sub.timetable_entry
        if lec and lec.is_active:
            existing_session = AttendanceSession.query.filter_by(
                timetable_entry_id=lec.id,
                lecture_date=today
            ).first()

            lec_dict = lec.to_dict()
            lec_dict["attendance_submitted"] = bool(existing_session)
            lec_dict["session_id"] = existing_session.id if existing_session else None
            lec_dict["session_status"] = existing_session.status if existing_session else "PENDING"
            lec_dict["is_substituted"] = True
            lec_dict["is_swapped_away"] = False
            lec_dict["swap_id"] = sub.id
            req_user = sub.requesting_faculty.user if sub.requesting_faculty else None
            lec_dict["substitute_for"] = req_user.full_name if req_user else "Colleague"
            lectures_data.append(lec_dict)

    # Sort all today's lectures by start time
    lectures_data.sort(key=lambda x: x.get("start_time") or "00:00")

    # Assigned subjects count
    assignments_count = len(faculty.subject_assignments)
    total_conducted = (
        AttendanceSession.query
        .join(AttendanceSession.timetable_entry)
        .filter(TimetableEntry.faculty_id == faculty.id, AttendanceSession.status == "FINALIZED")
        .count()
    )

    pending_swaps_count = LectureSwap.query.filter_by(
        substitute_faculty_id=faculty.id,
        status="PENDING"
    ).count()

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
                "pending_swaps_count": pending_swaps_count,
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

    target_date_str = request.args.get("date") or date.today().isoformat()
    try:
        target_date = datetime.strptime(target_date_str, "%Y-%m-%d").date()
    except ValueError:
        target_date = date.today()

    # Permission check: verify this lecture is assigned to this faculty OR has an accepted swap for this date
    is_assigned = (entry.faculty_id == faculty.id)
    has_swap = False
    if not is_assigned:
        has_swap = LectureSwap.query.filter_by(
            timetable_entry_id=entry.id,
            substitute_faculty_id=faculty.id,
            target_date=target_date,
            status="ACCEPTED"
        ).first() is not None

    if not is_assigned and not has_swap:
        return error_response(
            message="Unauthorized: You are not assigned or authorized to conduct this lecture.",
            error_code="FORBIDDEN_LECTURE",
            status_code=403
        )

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


# ==========================================
# LECTURE SWAP & SUBSTITUTION FOR FACULTY
# ==========================================

@faculty_bp.route("/colleagues", methods=["GET"])
@role_required("faculty")
def get_colleagues():
    """Returns list of other active faculty members for swap / substitution assignment."""
    current_fac = current_user.faculty_profile
    if not current_fac:
        return error_response(message="Faculty profile not found.", status_code=404)

    colleagues = (
        FacultyProfile.query
        .join(FacultyProfile.user)
        .filter(User.is_active == True, FacultyProfile.id != current_fac.id)
        .order_by(User.full_name.asc())
        .all()
    )

    result = [
        {
            "id": f.id,
            "faculty_id": f.faculty_id,
            "full_name": f.user.full_name,
            "email": f.user.email,
            "department": f.department,
            "designation": f.designation,
        }
        for f in colleagues
    ]
    return success_response(data={"colleagues": result})


@faculty_bp.route("/swaps", methods=["GET"])
@role_required("faculty")
def get_faculty_swaps():
    """
    Returns incoming swap requests (where this faculty is requested to substitute)
    and outgoing swap requests (where this faculty asked someone to cover/swap).
    """
    faculty = current_user.faculty_profile
    if not faculty:
        return error_response(message="Faculty profile not found.", status_code=404)

    incoming = (
        LectureSwap.query
        .filter_by(substitute_faculty_id=faculty.id)
        .order_by(LectureSwap.target_date.desc(), LectureSwap.created_at.desc())
        .all()
    )

    outgoing = (
        LectureSwap.query
        .filter_by(requesting_faculty_id=faculty.id)
        .order_by(LectureSwap.target_date.desc(), LectureSwap.created_at.desc())
        .all()
    )

    return success_response(
        data={
            "incoming": [s.to_dict() for s in incoming],
            "outgoing": [s.to_dict() for s in outgoing],
        },
        message="Faculty lecture swap requests retrieved successfully."
    )


@faculty_bp.route("/swaps", methods=["POST"])
@role_required("faculty")
def request_lecture_swap():
    """
    Requests a lecture swap / substitution with another faculty member when busy.
    Request body:
    {
        "timetable_entry_id": 12,
        "substitute_faculty_id": 5,
        "target_date": "YYYY-MM-DD",
        "reason": "Attending University Workshop",
        "notes": "Please cover Chapter 4",
        "target_timetable_entry_id": 18 (optional reciprocal slot),
        "target_swap_date": "YYYY-MM-DD" (optional)
    }
    """
    faculty = current_user.faculty_profile
    if not faculty:
        return error_response(message="Faculty profile not found.", status_code=404)

    data = request.get_json() or {}
    timetable_entry_id = data.get("timetable_entry_id")
    substitute_faculty_id = data.get("substitute_faculty_id")
    target_date_str = data.get("target_date")
    reason = (data.get("reason") or "Faculty Busy / Official Duty").strip()
    notes = data.get("notes")
    target_timetable_entry_id = data.get("target_timetable_entry_id")
    target_swap_date_str = data.get("target_swap_date")

    if not timetable_entry_id or not substitute_faculty_id or not target_date_str:
        return error_response(
            message="Timetable entry, substitute colleague, and target date are required.",
            status_code=400
        )

    entry = TimetableEntry.query.get(timetable_entry_id)
    if not entry or not entry.is_active:
        return error_response(message="Timetable entry not found or inactive.", status_code=404)

    if entry.faculty_id != faculty.id:
        return error_response(
            message="Unauthorized: You can only swap lectures assigned to you.",
            status_code=403
        )

    try:
        target_date = datetime.strptime(target_date_str, "%Y-%m-%d").date()
    except ValueError:
        return error_response(message="Invalid target date format. Expected YYYY-MM-DD.", status_code=400)

    # Validate that day of week matches
    if target_date.strftime("%A") != entry.day_of_week:
        return error_response(
            message=f"Target date {target_date_str} falls on a {target_date.strftime('%A')}, "
                    f"but this lecture is scheduled for {entry.day_of_week}.",
            status_code=400
        )

    substitute = FacultyProfile.query.get(substitute_faculty_id)
    if not substitute or not substitute.user or not substitute.user.is_active:
        return error_response(message="Substitute faculty colleague not found or inactive.", status_code=404)

    if substitute.id == faculty.id:
        return error_response(message="You cannot assign yourself as the substitute.", status_code=400)

    target_swap_date = None
    if target_swap_date_str:
        try:
            target_swap_date = datetime.strptime(target_swap_date_str, "%Y-%m-%d").date()
        except ValueError:
            pass

    # Check for duplicate pending swap
    existing = LectureSwap.query.filter_by(
        timetable_entry_id=entry.id,
        target_date=target_date,
        status="PENDING"
    ).first()
    if existing:
        return error_response(
            message="A pending swap request for this lecture on this date already exists.",
            status_code=409
        )

    swap = LectureSwap(
        timetable_entry_id=entry.id,
        requesting_faculty_id=faculty.id,
        substitute_faculty_id=substitute.id,
        target_date=target_date,
        target_timetable_entry_id=target_timetable_entry_id,
        target_swap_date=target_swap_date,
        reason=reason,
        notes=notes,
        status="PENDING",
    )
    db.session.add(swap)
    db.session.commit()

    # Notify substitute faculty
    subject_title = entry.subject.name if entry.subject else "Class"
    NotificationService.notify(
        user_id=substitute.user_id,
        title="Lecture Swap Request Received",
        message=f"Prof. {current_user.full_name} is busy and requested you to cover their lecture for "
                f"{subject_title} ({entry.class_ref.code if entry.class_ref else ''}) on {target_date_str}.",
        notification_type="LECTURE_SWAP_REQUEST",
        data={"swap_id": swap.id, "target_date": target_date_str}
    )

    AuditService.log(
        action="LECTURE_SWAP_REQUESTED",
        user_id=current_user.id,
        entity_type="LectureSwap",
        entity_id=swap.id,
        details={
            "requesting_faculty_id": faculty.id,
            "substitute_faculty_id": substitute.id,
            "target_date": target_date_str,
            "timetable_entry_id": entry.id
        }
    )

    return success_response(
        data={"swap": swap.to_dict()},
        message="Lecture swap request submitted to colleague successfully.",
        status_code=201
    )


@faculty_bp.route("/swaps/<int:id>/respond", methods=["PUT"])
@role_required("faculty")
def respond_to_lecture_swap(id):
    """
    Colleague accepts or rejects an incoming lecture swap request.
    Request body: { "action": "ACCEPT" | "REJECT", "notes": "Sure, I'll take it." }
    """
    faculty = current_user.faculty_profile
    if not faculty:
        return error_response(message="Faculty profile not found.", status_code=404)

    swap = LectureSwap.query.get(id)
    if not swap:
        return error_response(message="Lecture swap request not found.", status_code=404)

    if swap.substitute_faculty_id != faculty.id:
        return error_response(
            message="Unauthorized: You are not the assigned substitute for this request.",
            status_code=403
        )

    if swap.status != "PENDING":
        return error_response(
            message=f"This swap request has already been resolved (Status: {swap.status}).",
            status_code=400
        )

    data = request.get_json() or {}
    action = (data.get("action") or "").upper().strip()
    resp_notes = data.get("notes")

    if action not in ["ACCEPT", "REJECT"]:
        return error_response(message="Action must be either 'ACCEPT' or 'REJECT'.", status_code=400)

    if action == "ACCEPT":
        swap.status = "ACCEPTED"
        msg = f"Prof. {current_user.full_name} accepted your lecture swap request for " \
              f"{swap.timetable_entry.subject.name if swap.timetable_entry and swap.timetable_entry.subject else 'your class'} " \
              f"on {swap.target_date.isoformat()}."
        notif_type = "LECTURE_SWAP_ACCEPTED"
    else:
        swap.status = "REJECTED"
        msg = f"Prof. {current_user.full_name} declined your lecture swap request for " \
              f"lecture on {swap.target_date.isoformat()}."
        notif_type = "LECTURE_SWAP_REJECTED"

    if resp_notes:
        swap.notes = (swap.notes or "") + f" [Response: {resp_notes}]"

    db.session.commit()

    # Notify requesting faculty
    if swap.requesting_faculty and swap.requesting_faculty.user_id:
        NotificationService.notify(
            user_id=swap.requesting_faculty.user_id,
            title=f"Lecture Swap {swap.status.capitalize()}",
            message=msg,
            notification_type=notif_type,
            data={"swap_id": swap.id, "status": swap.status}
        )

    AuditService.log(
        action=f"LECTURE_SWAP_{swap.status}",
        user_id=current_user.id,
        entity_type="LectureSwap",
        entity_id=swap.id,
        details={"status": swap.status, "notes": resp_notes}
    )

    return success_response(
        data={"swap": swap.to_dict()},
        message=f"Lecture swap request {swap.status.lower()}ed successfully."
    )


@faculty_bp.route("/swaps/<int:id>", methods=["DELETE"])
@role_required("faculty")
def cancel_lecture_swap(id):
    """Cancels a pending lecture swap request created by the authenticated faculty."""
    faculty = current_user.faculty_profile
    if not faculty:
        return error_response(message="Faculty profile not found.", status_code=404)

    swap = LectureSwap.query.get(id)
    if not swap:
        return error_response(message="Lecture swap request not found.", status_code=404)

    if swap.requesting_faculty_id != faculty.id:
        return error_response(message="Unauthorized: You did not initiate this swap request.", status_code=403)

    if swap.status != "PENDING":
        return error_response(message="Only pending swap requests can be cancelled.", status_code=400)

    swap.status = "CANCELLED"
    db.session.commit()

    return success_response(message="Lecture swap request cancelled successfully.")


# ==========================================
# TIMETABLE BULK CSV IMPORT FOR FACULTY
# ==========================================

@faculty_bp.route("/timetable/import-csv", methods=["POST"])
@role_required("faculty")
def import_timetable_csv():
    """
    Imports timetable entries from a CSV file uploaded by the faculty member.
    Automatically assigns entries to the authenticated faculty member if not specified.
    Validates classes, subjects, times, and schedule conflicts.
    """
    faculty = current_user.faculty_profile
    if not faculty:
        return error_response(message="Faculty profile not found.", status_code=404)

    rows, err = parse_csv_input(request)
    if err:
        return error_response(message=err, status_code=400)

    valid_days = {"monday", "tuesday", "wednesday", "thursday", "friday", "saturday"}
    imported_count = 0
    skipped_count = 0
    errors = []

    for row in rows:
        line_num = row.get("_line_number", 0)
        class_str = get_field_val(row, "class_code", "class_name", "class", "code")
        subject_str = get_field_val(row, "subject_code", "subject_name", "subject")
        day_raw = get_field_val(row, "day_of_week", "day")
        start_time_str = get_field_val(row, "start_time", "start")
        end_time_str = get_field_val(row, "end_time", "end")
        room_number = get_field_val(row, "room_number", "room", default="Room 101")

        if not class_str or not subject_str or not day_raw or not start_time_str or not end_time_str:
            errors.append(f"Row {line_num}: Missing required fields (class, subject, day, start_time, end_time).")
            skipped_count += 1
            continue

        day_of_week = day_raw.capitalize()
        if day_of_week.lower() not in valid_days:
            errors.append(f"Row {line_num}: Invalid day of week '{day_raw}'. Must be Monday through Saturday.")
            skipped_count += 1
            continue

        # Resolve Class
        cls = Class.query.filter(
            (Class.code.ilike(class_str)) | (Class.name.ilike(class_str))
        ).first()
        if not cls:
            errors.append(f"Row {line_num}: Class '{class_str}' was not found in database.")
            skipped_count += 1
            continue

        # Resolve Subject
        sub = Subject.query.filter(
            (Subject.code.ilike(subject_str)) | (Subject.name.ilike(subject_str))
        ).first()
        if not sub:
            errors.append(f"Row {line_num}: Subject '{subject_str}' was not found in database.")
            skipped_count += 1
            continue

        # Check Conflict
        valid, conflict_msg = TimetableService.check_conflict(
            day_of_week=day_of_week,
            start_time_val=start_time_str,
            end_time_val=end_time_str,
            class_id=cls.id,
            faculty_id=faculty.id,
            room_number=room_number,
        )
        if not valid:
            errors.append(f"Row {line_num}: {conflict_msg}")
            skipped_count += 1
            continue

        start = TimetableService.parse_time(start_time_str)
        end = TimetableService.parse_time(end_time_str)

        try:
            entry = TimetableEntry(
                class_id=cls.id,
                subject_id=sub.id,
                faculty_id=faculty.id,
                day_of_week=day_of_week,
                start_time=start,
                end_time=end,
                room_number=room_number,
                is_active=True,
                status="published",
            )
            db.session.add(entry)
            imported_count += 1
        except Exception as e:
            errors.append(f"Row {line_num}: Unexpected error adding entry: {str(e)}")
            skipped_count += 1

    try:
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        return error_response(message=f"Database commit error: {str(e)}", status_code=500)

    AuditService.log(
        action="TIMETABLE_CSV_IMPORTED",
        user_id=current_user.id,
        entity_type="TimetableEntry",
        details={"imported": imported_count, "skipped": skipped_count}
    )

    return success_response(
        data={
            "imported_count": imported_count,
            "skipped_count": skipped_count,
            "errors": errors,
            "total_rows": len(rows),
        },
        message=f"Timetable CSV import processed: {imported_count} lectures imported, {skipped_count} skipped.",
        status_code=201 if imported_count > 0 else 200
    )

