"""Attendance business logic service: absent-first workflow, calculations, and validation."""
import math
from datetime import datetime, date
from app.extensions import db
from app.models.timetable import TimetableEntry
from app.models.academic import Class, StudentEnrollment
from app.models.user import StudentProfile
from app.models.attendance import AttendanceSession, AttendanceRecord, AttendanceCorrectionRequest
from app.services.audit_service import AuditService
from app.services.notification_service import NotificationService


class AttendanceService:
    @staticmethod
    def get_eligible_students_for_lecture(timetable_entry_id: int):
        """
        Retrieves all active students enrolled in the class for the specified timetable entry.
        Never trusts client-supplied student list.
        """
        entry = TimetableEntry.query.get(timetable_entry_id)
        if not entry:
            return None, "Timetable entry not found"

        # Fetch students who belong to the class
        students = (
            StudentProfile.query
            .filter_by(class_id=entry.class_id)
            .join(StudentProfile.user)
            .filter_by(is_active=True)
            .order_by(StudentProfile.roll_number.asc())
            .all()
        )
        return students, None

    @staticmethod
    def submit_absent_first_attendance(
        faculty_user_id: int,
        timetable_entry_id: int,
        lecture_date_str: str,
        absent_student_ids: list,
        notes: str = None,
        is_admin: bool = False
    ):
        """
        Executes absent-first attendance submission:
        - Validates faculty authorization to mark this class
        - Validates date
        - Fetches authoritative student roster from database
        - Validates absent_student_ids
        - Marks absent students as ABSENT, all other eligible as PRESENT
        - Uses transactional commit/rollback to guarantee atomicity
        - Prevents duplicate attendance sessions
        - Dispatches notifications for newly recorded absences
        - Creates audit log
        """
        entry = TimetableEntry.query.get(timetable_entry_id)
        if not entry:
            return None, "Timetable entry not found", 404

        # Validate faculty authorization
        if not is_admin:
            if not entry.faculty or entry.faculty.user_id != faculty_user_id:
                return None, "Unauthorized: You are not assigned to conduct this lecture.", 403

        # Parse lecture date
        try:
            if isinstance(lecture_date_str, str):
                target_date = datetime.strptime(lecture_date_str, "%Y-%m-%d").date()
            elif isinstance(lecture_date_str, date):
                target_date = lecture_date_str
            else:
                return None, "Invalid date format. Expected YYYY-MM-DD", 400
        except ValueError:
            return None, "Invalid date format. Expected YYYY-MM-DD", 400

        # Prevent duplicate session for the same timetable entry and date
        existing_session = AttendanceSession.query.filter_by(
            timetable_entry_id=timetable_entry_id,
            lecture_date=target_date
        ).first()

        if existing_session:
            return None, (
                f"Attendance for this lecture on {target_date.isoformat()} has already been "
                f"submitted (Status: {existing_session.status}). Duplicate submissions are prohibited. "
                "Please submit a correction request if revisions are needed."
            ), 409

        # Retrieve authoritative enrolled students
        eligible_students, err = AttendanceService.get_eligible_students_for_lecture(timetable_entry_id)
        if err:
            return None, err, 400

        if not eligible_students:
            return None, "No active students are enrolled in this class to receive attendance.", 400

        eligible_ids_set = {s.id for s in eligible_students}
        absent_set = set(absent_student_ids or [])

        # Validate that all absent_student_ids belong to this class
        invalid_ids = absent_set - eligible_ids_set
        if invalid_ids:
            return None, f"Invalid student IDs submitted: {list(invalid_ids)}. They are not enrolled in this class.", 400

        # Begin transactional recording
        try:
            session = AttendanceSession(
                timetable_entry_id=timetable_entry_id,
                lecture_date=target_date,
                status="FINALIZED",
                submitted_by_id=faculty_user_id,
                submitted_at=datetime.utcnow(),
                submission_notes=notes,
            )
            db.session.add(session)
            db.session.flush()  # Populates session.id

            absent_students_list = []
            for student in eligible_students:
                is_absent = student.id in absent_set
                status = "ABSENT" if is_absent else "PRESENT"
                if is_absent:
                    absent_students_list.append(student)

                record = AttendanceRecord(
                    session_id=session.id,
                    student_id=student.id,
                    status=status,
                    marked_at=datetime.utcnow(),
                )
                db.session.add(record)

            db.session.commit()

            # Audit trail
            AuditService.log(
                action="ATTENDANCE_SUBMITTED",
                user_id=faculty_user_id,
                entity_type="AttendanceSession",
                entity_id=session.id,
                details={
                    "timetable_entry_id": timetable_entry_id,
                    "date": target_date.isoformat(),
                    "total_students": len(eligible_students),
                    "absent_count": len(absent_set),
                    "present_count": len(eligible_students) - len(absent_set),
                }
            )

            # Dispatch absence alerts in background/service
            for abs_student in absent_students_list:
                try:
                    NotificationService.notify_absence(abs_student, session)
                except Exception as notif_err:
                    print(f"[Notice] Failed to notify absence: {notif_err}")

            return session.to_dict(include_records=True), None, 201

        except Exception as e:
            db.session.rollback()
            print(f"[Attendance Submission Error] Transaction rolled back: {e}")
            return None, f"Database transaction failed: {str(e)}", 500

    @staticmethod
    def calculate_shortage(present: int, total: int, target_threshold: float = 75.0) -> dict:
        """
        Calculates consecutive additional classes needed to reach required target attendance percentage.
        Formula: (P + x) / (T + x) >= R  ==>  x = ceil((R*T - P) / (1 - R))
        """
        R = target_threshold / 100.0
        current_pct = round((present / total * 100), 2) if total > 0 else 100.0

        if R >= 1.0:
            if present == total and total > 0:
                needed = 0
                achievable = True
            else:
                needed = None
                achievable = False
            return {
                "target_threshold": target_threshold,
                "current_percentage": current_pct,
                "classes_needed": needed,
                "achievable": achievable,
                "already_satisfied": current_pct >= target_threshold,
                "note": "A 100% attendance rate cannot be mathematically achieved once any class is missed." if not achievable else "Goal reached."
            }

        # Check if already above or equal to threshold
        if current_pct >= target_threshold:
            return {
                "target_threshold": target_threshold,
                "current_percentage": current_pct,
                "classes_needed": 0,
                "achievable": True,
                "already_satisfied": True,
                "note": f"Current attendance ({current_pct}%) already meets or exceeds the target {target_threshold}%."
            }

        numerator = (R * total) - present
        denominator = 1.0 - R
        x = math.ceil(numerator / denominator)
        classes_needed = max(0, x)

        return {
            "target_threshold": target_threshold,
            "current_percentage": current_pct,
            "classes_needed": classes_needed,
            "achievable": True,
            "already_satisfied": False,
            "note": f"Need to attend the next {classes_needed} consecutive classes without missing any to reach {target_threshold}%."
        }

    @staticmethod
    def get_student_subject_wise_summary(student_id: int):
        """
        Computes accurate subject-wise attendance for a student across all finalized sessions.
        """
        student = StudentProfile.query.get(student_id)
        if not student:
            return None, "Student not found"

        # Query all finalized records for this student
        records = (
            AttendanceRecord.query
            .filter_by(student_id=student_id)
            .join(AttendanceRecord.session)
            .filter(AttendanceSession.status == "FINALIZED")
            .all()
        )

        subject_map = {}
        total_conducted = 0
        total_present = 0
        total_absent = 0

        for r in records:
            session = r.session
            entry = session.timetable_entry
            if not entry or not entry.subject:
                continue
            
            sub = entry.subject
            if sub.id not in subject_map:
                subject_map[sub.id] = {
                    "subject_id": sub.id,
                    "subject_code": sub.code,
                    "subject_name": sub.name,
                    "credits": sub.credits,
                    "faculty_name": entry.faculty.user.full_name if entry.faculty and entry.faculty.user else "Faculty",
                    "conducted": 0,
                    "present": 0,
                    "absent": 0,
                    "records": [],
                }
            
            subject_map[sub.id]["conducted"] += 1
            total_conducted += 1

            if r.status == "PRESENT":
                subject_map[sub.id]["present"] += 1
                total_present += 1
            else:
                subject_map[sub.id]["absent"] += 1
                total_absent += 1

            subject_map[sub.id]["records"].append({
                "date": session.lecture_date.isoformat(),
                "status": r.status,
                "session_id": session.id,
            })

        # Calculate percentages and shortage calculations
        subjects_list = []
        shortage_count = 0
        warning_threshold = 75.0

        for sub_id, data in subject_map.items():
            pct = round((data["present"] / data["conducted"] * 100), 2) if data["conducted"] > 0 else 100.0
            data["percentage"] = pct
            
            # Status badge
            if pct >= 85.0:
                data["status_tier"] = "EXCELLENT"
                data["status_color"] = "green"
            elif pct >= 75.0:
                data["status_tier"] = "SATISFACTORY"
                data["status_color"] = "amber"
            else:
                data["status_tier"] = "SHORTAGE"
                data["status_color"] = "red"
                shortage_count += 1

            # Shortage calculator projection
            data["shortage_info"] = AttendanceService.calculate_shortage(
                present=data["present"],
                total=data["conducted"],
                target_threshold=warning_threshold
            )
            subjects_list.append(data)

        # Sort alphabetically by subject code
        subjects_list.sort(key=lambda x: x["subject_code"])

        overall_pct = round((total_present / total_conducted * 100), 2) if total_conducted > 0 else 100.0

        summary = {
            "student_id": student.id,
            "roll_number": student.roll_number,
            "full_name": student.user.full_name,
            "class_name": student.current_class.name if student.current_class else None,
            "class_code": student.current_class.code if student.current_class else None,
            "total_conducted": total_conducted,
            "total_present": total_present,
            "total_absent": total_absent,
            "overall_percentage": overall_pct,
            "subjects_below_threshold": shortage_count,
            "threshold_limit": warning_threshold,
            "subjects": subjects_list,
        }
        return summary, None
