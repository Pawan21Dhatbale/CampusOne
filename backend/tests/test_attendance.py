"""Comprehensive tests for absent-first attendance, atomicity, duplicate prevention, and calculations."""
from tests.conftest import get_token_for
from app.models.user import StudentProfile
from app.models.timetable import TimetableEntry
from app.models.attendance import AttendanceSession, AttendanceRecord
from app.services.attendance_service import AttendanceService
from app.extensions import db


def test_absent_first_attendance_submission(client, init_database):
    """
    CRITICAL TEST:
    Class has 20 eligible students.
    Faculty submits 3 absent student IDs.
    Verifies:
      - 3 students recorded as ABSENT in PostgreSQL/SQLite
      - 17 students recorded as PRESENT in PostgreSQL/SQLite
      - Exactly 20 attendance records created
      - Attendance percentage is 85%
      - Verified against database records directly.
    """
    token = get_token_for(client, "faculty1@test.edu", "Faculty@123")
    
    # Get entry 1 (taught by faculty 1)
    entry = TimetableEntry.query.filter_by(day_of_week="Monday").first()
    assert entry is not None

    # Get first 3 students to mark absent
    students = StudentProfile.query.filter_by(class_id=entry.class_id).all()
    assert len(students) == 20

    absent_ids = [students[0].id, students[1].id, students[2].id]

    payload = {
        "date": "2025-10-13",
        "absent_student_ids": absent_ids,
        "notes": "Regular lecture on Algorithms"
    }

    res = client.post(
        f"/api/v1/faculty/lectures/{entry.id}/attendance",
        json=payload,
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res.status_code == 201
    data = res.get_json()["data"]["attendance_session"]

    # 1. Check API response values
    assert data["total_students"] == 20
    assert data["absent_count"] == 3
    assert data["present_count"] == 17
    assert data["attendance_percentage"] == 85.0

    # 2. Directly verify database records
    session = AttendanceSession.query.filter_by(timetable_entry_id=entry.id, lecture_date="2025-10-13").first()
    assert session is not None
    assert session.status == "FINALIZED"

    records = AttendanceRecord.query.filter_by(session_id=session.id).all()
    assert len(records) == 20

    absent_records = [r for r in records if r.status == "ABSENT"]
    present_records = [r for r in records if r.status == "PRESENT"]

    assert len(absent_records) == 3
    assert len(present_records) == 17

    db_absent_student_ids = {r.student_id for r in absent_records}
    assert db_absent_student_ids == set(absent_ids)


def test_prevent_duplicate_attendance_submission(client, init_database):
    """Submitting attendance twice for the same scheduled lecture date must fail with 409 Conflict."""
    token = get_token_for(client, "faculty1@test.edu", "Faculty@123")
    entry = TimetableEntry.query.filter_by(day_of_week="Monday").first()

    payload = {"date": "2025-10-13", "absent_student_ids": []}

    # First submission -> 201 Created
    res1 = client.post(f"/api/v1/faculty/lectures/{entry.id}/attendance", json=payload, headers={"Authorization": f"Bearer {token}"})
    assert res1.status_code == 201

    # Second submission for same lecture & date -> 409 Conflict
    res2 = client.post(f"/api/v1/faculty/lectures/{entry.id}/attendance", json=payload, headers={"Authorization": f"Bearer {token}"})
    assert res2.status_code == 409
    assert "already been submitted" in res2.get_json()["message"]


def test_unauthorized_faculty_cannot_mark_attendance(client, init_database):
    """Faculty 2 cannot submit attendance for Faculty 1's scheduled lecture."""
    # Log in as Faculty 2
    token_f2 = get_token_for(client, "faculty2@test.edu", "Faculty@123")
    
    # Entry 1 belongs to Faculty 1
    entry_f1 = TimetableEntry.query.filter_by(day_of_week="Monday").first()

    payload = {"date": "2025-10-13", "absent_student_ids": []}
    res = client.post(
        f"/api/v1/faculty/lectures/{entry_f1.id}/attendance",
        json=payload,
        headers={"Authorization": f"Bearer {token_f2}"}
    )
    assert res.status_code == 403
    assert "not assigned" in res.get_json()["message"].lower()


def test_invalid_student_id_rejected(client, init_database):
    """Submitting an absent ID that does not belong to the class must be rejected with 400."""
    token = get_token_for(client, "faculty1@test.edu", "Faculty@123")
    entry = TimetableEntry.query.filter_by(day_of_week="Monday").first()

    # Pass invalid student ID (e.g. 99999)
    payload = {"date": "2025-10-13", "absent_student_ids": [99999]}
    res = client.post(
        f"/api/v1/faculty/lectures/{entry.id}/attendance",
        json=payload,
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res.status_code == 400
    assert "Invalid student IDs" in res.get_json()["message"]


def test_attendance_shortage_calculation_math():
    """
    Verifies attendance shortage calculator formula:
    (P + x) / (T + x) >= R  ==> x = ceil((R*T - P) / (1 - R))
    """
    # Example 1: Total = 10, Present = 6 (60%). Target = 75% (0.75).
    # Numerator: 0.75*10 - 6 = 7.5 - 6 = 1.5
    # Denominator: 1 - 0.75 = 0.25
    # x = 1.5 / 0.25 = 6 classes needed!
    # Verification: (6 + 6) / (10 + 6) = 12 / 16 = 75% exactly!
    calc = AttendanceService.calculate_shortage(present=6, total=10, target_threshold=75.0)
    assert calc["classes_needed"] == 6
    assert calc["already_satisfied"] is False

    # Example 2: Total = 20, Present = 18 (90%). Target = 75%.
    # Already above threshold -> 0 classes needed
    calc2 = AttendanceService.calculate_shortage(present=18, total=20, target_threshold=75.0)
    assert calc2["classes_needed"] == 0
    assert calc2["already_satisfied"] is True
