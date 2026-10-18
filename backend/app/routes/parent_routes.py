"""Parent REST API routes: child switcher, child dashboard, weekly reports, and history."""
from datetime import datetime, date, timedelta
from flask import Blueprint, request
from flask_jwt_extended import current_user
from app.models.user import ParentProfile, ParentStudentRelationship, StudentProfile
from app.models.timetable import TimetableEntry
from app.models.attendance import AttendanceSession, AttendanceRecord
from app.services.attendance_service import AttendanceService
from app.utils.decorators import role_required
from app.utils.response import success_response, error_response

parent_bp = Blueprint("parent", __name__)


def verify_parent_child_access(student_id: int):
    """
    Security check: Verifies that the authenticated parent is explicitly linked
    to the requested student in the database.
    Returns (StudentProfile, error_response) tuple.
    """
    parent_prof = current_user.parent_profile
    if not parent_prof:
        return None, ("Parent profile not found for this user.", 404)

    # Check relation in ParentStudentRelationship
    relation = ParentStudentRelationship.query.filter_by(
        parent_id=parent_prof.id,
        student_id=student_id
    ).first()

    if not relation:
        return None, (
            "Access Denied: You are not authorized to view this student's records.",
            403
        )

    student = StudentProfile.query.get(student_id)
    if not student:
        return None, ("Student profile not found.", 404)

    return student, None


@parent_bp.route("/dashboard", methods=["GET"])
@role_required("parent")
def get_parent_dashboard():
    """
    Returns parent dashboard with all linked children and metrics for the primary/selected child.
    """
    parent_prof = current_user.parent_profile
    if not parent_prof:
        return error_response(message="Parent profile not found.", status_code=404)

    links = ParentStudentRelationship.query.filter_by(parent_id=parent_prof.id).all()
    if not links:
        return success_response(
            data={"children": [], "selected_child": None, "summary": None},
            message="No children currently linked to this parent account."
        )

    children_list = [
        {
            "student_profile_id": link.student.id,
            "student_id": link.student.student_id,
            "roll_number": link.student.roll_number,
            "full_name": link.student.user.full_name,
            "class_name": link.student.current_class.name if link.student.current_class else "N/A",
            "class_code": link.student.current_class.code if link.student.current_class else "N/A",
            "relationship_type": link.relationship_type,
        }
        for link in links if link.student and link.student.user
    ]

    # Select child from query param or default to first child
    selected_child_id = request.args.get("child_id", type=int)
    if not selected_child_id or not any(c["student_profile_id"] == selected_child_id for c in children_list):
        selected_child_id = children_list[0]["student_profile_id"]

    summary, err = AttendanceService.get_student_subject_wise_summary(selected_child_id)
    if err:
        return error_response(message=err, status_code=400)

    # Calculate this week's attendance percentage
    today = date.today()
    start_of_week = today - timedelta(days=today.weekday())  # Monday
    end_of_week = start_of_week + timedelta(days=6)         # Sunday

    week_records = (
        AttendanceRecord.query
        .filter_by(student_id=selected_child_id)
        .join(AttendanceRecord.session)
        .filter(
            AttendanceSession.status == "FINALIZED",
            AttendanceSession.lecture_date >= start_of_week,
            AttendanceSession.lecture_date <= end_of_week
        )
        .all()
    )

    week_total = len(week_records)
    week_present = sum(1 for r in week_records if r.status == "PRESENT")
    week_pct = round((week_present / week_total * 100), 2) if week_total > 0 else 100.0

    return success_response(
        data={
            "parent": parent_prof.to_dict(),
            "children": children_list,
            "selected_child_id": selected_child_id,
            "summary": summary,
            "this_week": {
                "start_date": start_of_week.isoformat(),
                "end_date": end_of_week.isoformat(),
                "conducted": week_total,
                "attended": week_present,
                "absences": week_total - week_present,
                "percentage": week_pct,
            }
        },
        message="Parent dashboard loaded successfully."
    )


@parent_bp.route("/children", methods=["GET"])
@role_required("parent")
def list_linked_children():
    """Lists only the student(s) linked to this parent."""
    parent_prof = current_user.parent_profile
    if not parent_prof:
        return error_response(message="Parent profile not found.", status_code=404)

    links = ParentStudentRelationship.query.filter_by(parent_id=parent_prof.id).all()
    children = [
        {
            "student_profile_id": link.student.id,
            "student_id": link.student.student_id,
            "roll_number": link.student.roll_number,
            "full_name": link.student.user.full_name,
            "class_name": link.student.current_class.name if link.student.current_class else "N/A",
            "relationship": link.relationship_type,
        }
        for link in links if link.student and link.student.user
    ]

    return success_response(data={"children": children})


@parent_bp.route("/children/<int:id>/attendance/summary", methods=["GET"])
@role_required("parent")
def get_child_attendance_summary(id):
    """Subject-wise attendance summary for a linked child."""
    student, err = verify_parent_child_access(id)
    if err:
        msg, code = err
        return error_response(message=msg, status_code=code)

    summary, err = AttendanceService.get_student_subject_wise_summary(student.id)
    if err:
        return error_response(message=err, status_code=400)

    return success_response(data={"summary": summary})


@parent_bp.route("/children/<int:id>/attendance/weekly", methods=["GET"])
@role_required("parent")
def get_child_weekly_report(id):
    """
    Computes weekly attendance reports across past weeks for a linked child.
    """
    student, err = verify_parent_child_access(id)
    if err:
        msg, code = err
        return error_response(message=msg, status_code=code)

    today = date.today()
    weeks_count = request.args.get("weeks", default=4, type=int)
    weekly_reports = []

    for w in range(weeks_count):
        # Calculate Monday and Sunday for this relative week
        offset_days = w * 7
        curr_monday = today - timedelta(days=today.weekday() + offset_days)
        curr_sunday = curr_monday + timedelta(days=6)

        records = (
            AttendanceRecord.query
            .filter_by(student_id=student.id)
            .join(AttendanceRecord.session)
            .join(AttendanceSession.timetable_entry)
            .filter(
                AttendanceSession.status == "FINALIZED",
                AttendanceSession.lecture_date >= curr_monday,
                AttendanceSession.lecture_date <= curr_sunday
            )
            .all()
        )

        conducted = len(records)
        attended = sum(1 for r in records if r.status == "PRESENT")
        absent = conducted - attended
        has_classes = conducted > 0
        pct = round((attended / conducted * 100), 2) if has_classes else None

        # Subject breakdown for this week
        subject_breakdown = {}
        for r in records:
            sub = r.session.timetable_entry.subject if r.session and r.session.timetable_entry else None
            if not sub:
                continue
            if sub.code not in subject_breakdown:
                subject_breakdown[sub.code] = {"name": sub.name, "conducted": 0, "attended": 0}
            subject_breakdown[sub.code]["conducted"] += 1
            if r.status == "PRESENT":
                subject_breakdown[sub.code]["attended"] += 1

        weekly_reports.append({
            "week_label": f"Week {w + 1}" if w > 0 else "This Week",
            "week_start": curr_monday.isoformat(),
            "week_end": curr_sunday.isoformat(),
            "conducted": conducted,
            "attended": attended,
            "absent": absent,
            "has_classes": has_classes,
            "attendance_percentage": pct,
            "subjects": [
                {
                    "code": code,
                    "name": data["name"],
                    "conducted": data["conducted"],
                    "attended": data["attended"],
                    "pct": round((data["attended"] / data["conducted"] * 100), 1) if data["conducted"] > 0 else None
                }
                for code, data in subject_breakdown.items()
            ]
        })

    return success_response(
        data={
            "student_name": student.user.full_name,
            "weekly_reports": weekly_reports,
        },
        message="Weekly attendance report generated from finalized database records."
    )


@parent_bp.route("/children/<int:id>/attendance/monthly", methods=["GET"])
@role_required("parent")
def get_child_monthly_report(id):
    """Computes monthly attendance aggregates for past months for a linked child."""
    import calendar
    student, err = verify_parent_child_access(id)
    if err:
        msg, code = err
        return error_response(message=msg, status_code=code)

    months_count = request.args.get("months", default=6, type=int)
    today = date.today()
    monthly_reports = []

    for m in range(months_count):
        y = today.year
        mo = today.month - m
        while mo <= 0:
            mo += 12
            y -= 1

        num_days = calendar.monthrange(y, mo)[1]
        start_date = date(y, mo, 1)
        end_date = date(y, mo, num_days)

        records = (
            AttendanceRecord.query
            .filter_by(student_id=student.id)
            .join(AttendanceRecord.session)
            .join(AttendanceSession.timetable_entry)
            .filter(
                AttendanceSession.status == "FINALIZED",
                AttendanceSession.lecture_date >= start_date,
                AttendanceSession.lecture_date <= end_date,
            )
            .all()
        )

        conducted = len(records)
        attended = sum(1 for r in records if r.status == "PRESENT")
        absent = conducted - attended
        has_classes = conducted > 0
        pct = round((attended / conducted * 100), 2) if has_classes else None

        monthly_reports.append({
            "month_label": start_date.strftime("%B %Y"),
            "year": y,
            "month": mo,
            "conducted": conducted,
            "attended": attended,
            "absent": absent,
            "has_classes": has_classes,
            "attendance_percentage": pct,
        })

    return success_response(
        data={
            "student_name": student.user.full_name,
            "monthly_reports": monthly_reports,
        },
        message="Monthly attendance report generated."
    )


@parent_bp.route("/children/<int:id>/attendance/yearly", methods=["GET"])
@role_required("parent")
def get_child_yearly_report(id):
    """Computes yearly/semester attendance trends for a linked child."""
    student, err = verify_parent_child_access(id)
    if err:
        msg, code = err
        return error_response(message=msg, status_code=code)

    all_records = (
        AttendanceRecord.query
        .filter_by(student_id=student.id)
        .join(AttendanceRecord.session)
        .filter(AttendanceSession.status == "FINALIZED")
        .all()
    )

    years_map = {}
    for r in all_records:
        yr = r.session.lecture_date.year
        if yr not in years_map:
            years_map[yr] = {"conducted": 0, "attended": 0}
        years_map[yr]["conducted"] += 1
        if r.status == "PRESENT":
            years_map[yr]["attended"] += 1

    yearly_reports = []
    for yr, data in sorted(years_map.items(), reverse=True):
        c = data["conducted"]
        a = data["attended"]
        yearly_reports.append({
            "year": yr,
            "year_label": f"Academic Year {yr}",
            "conducted": c,
            "attended": a,
            "absent": c - a,
            "has_classes": c > 0,
            "attendance_percentage": round((a / c * 100), 2) if c > 0 else None,
        })

    return success_response(
        data={
            "student_name": student.user.full_name,
            "yearly_reports": yearly_reports,
        },
        message="Yearly attendance summary generated."
    )


@parent_bp.route("/children/<int:id>/attendance/history", methods=["GET"])
@role_required("parent")
def get_child_attendance_history(id):
    """Returns chronological attendance history for a linked child."""
    student, err = verify_parent_child_access(id)
    if err:
        msg, code = err
        return error_response(message=msg, status_code=code)

    records = (
        AttendanceRecord.query
        .filter_by(student_id=student.id)
        .join(AttendanceRecord.session)
        .join(AttendanceSession.timetable_entry)
        .filter(AttendanceSession.status == "FINALIZED")
        .order_by(AttendanceSession.lecture_date.desc(), AttendanceRecord.id.desc())
        .limit(100)
        .all()
    )

    result = []
    for r in records:
        entry = r.session.timetable_entry
        result.append({
            "id": r.id,
            "date": r.session.lecture_date.isoformat(),
            "status": r.status,
            "subject_code": entry.subject.code if entry and entry.subject else "N/A",
            "subject_name": entry.subject.name if entry and entry.subject else "N/A",
            "faculty_name": entry.faculty.user.full_name if entry and entry.faculty and entry.faculty.user else "Faculty",
            "start_time": entry.start_time.strftime("%H:%M") if entry and entry.start_time else "",
            "end_time": entry.end_time.strftime("%H:%M") if entry and entry.end_time else "",
        })

    return success_response(data={"records": result})


@parent_bp.route("/children/<int:id>/timetable", methods=["GET"])
@role_required("parent")
def get_child_timetable(id):
    """Returns the child's class timetable."""
    student, err = verify_parent_child_access(id)
    if err:
        msg, code = err
        return error_response(message=msg, status_code=code)

    if not student.class_id:
        return error_response(message="Child is not assigned to a class.", status_code=400)

    entries = (
        TimetableEntry.query
        .filter_by(class_id=student.class_id, is_active=True)
        .order_by(TimetableEntry.day_of_week, TimetableEntry.start_time)
        .all()
    )

    return success_response(data={"timetable": [e.to_dict() for e in entries]})
