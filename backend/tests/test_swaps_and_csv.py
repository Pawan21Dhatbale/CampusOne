"""Unit and integration tests for lecture swapping and CSV bulk imports."""
import json
import io
from datetime import date
from app.models.timetable import TimetableEntry, LectureSwap
from app.models.user import User, StudentProfile, FacultyProfile


def login(client, email, password):
    resp = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    return resp.json["data"]["access_token"]


def test_lecture_swap_workflow(client, init_database):
    """Verifies that faculty can request a lecture swap, colleague accepts, and colleague can take attendance."""
    # Login as Faculty 1 (Prof. Turing)
    f1_token = login(client, "faculty1@test.edu", "Faculty@123")
    f1_headers = {"Authorization": f"Bearer {f1_token}"}

    # Login as Faculty 2 (Prof. Hopper)
    f2_token = login(client, "faculty2@test.edu", "Faculty@123")
    f2_headers = {"Authorization": f"Bearer {f2_token}"}

    # Find Faculty 1's timetable entry
    t_entry = TimetableEntry.query.filter_by(day_of_week="Monday").first()
    assert t_entry is not None
    fac2 = FacultyProfile.query.filter_by(faculty_id="FAC002").first()
    assert fac2 is not None

    # Step 1: Faculty 1 requests swap for next Monday
    # Target date that is a Monday (e.g. 2026-10-26)
    target_date = "2026-10-26"  # 2026-10-26 is a Monday
    req_res = client.post(
        "/api/v1/faculty/swaps",
        headers=f1_headers,
        json={
            "timetable_entry_id": t_entry.id,
            "substitute_faculty_id": fac2.id,
            "target_date": target_date,
            "reason": "Attending CS Conference",
            "notes": "Please cover Chapter 4",
        },
    )
    assert req_res.status_code == 201
    swap_id = req_res.json["data"]["swap"]["id"]

    # Step 2: Faculty 2 checks incoming swaps
    swaps_res = client.get("/api/v1/faculty/swaps", headers=f2_headers)
    assert swaps_res.status_code == 200
    incoming = swaps_res.json["data"]["incoming"]
    assert any(s["id"] == swap_id and s["status"] == "PENDING" for s in incoming)

    # Step 3: Faculty 2 accepts swap
    respond_res = client.put(
        f"/api/v1/faculty/swaps/{swap_id}/respond",
        headers=f2_headers,
        json={"action": "ACCEPT", "notes": "Happy to cover!"},
    )
    assert respond_res.status_code == 200
    assert respond_res.json["data"]["swap"]["status"] == "ACCEPTED"

    # Step 4: Faculty 2 is authorized to load student roster for that lecture on target_date
    roster_res = client.get(
        f"/api/v1/faculty/lectures/{t_entry.id}/students?date={target_date}",
        headers=f2_headers,
    )
    assert roster_res.status_code == 200
    assert "students" in roster_res.json["data"]

    # Step 5: Faculty 2 submits attendance for that lecture on target_date
    att_res = client.post(
        f"/api/v1/faculty/lectures/{t_entry.id}/attendance",
        headers=f2_headers,
        json={
            "date": target_date,
            "absent_student_ids": [],
            "notes": "Conducted by substitute Prof. Hopper",
        },
    )
    assert att_res.status_code == 201


def test_bulk_csv_student_import(client, init_database):
    """Verifies that administrator can bulk import students from a CSV string."""
    admin_token = login(client, "admin@test.edu", "Admin@123")
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    csv_data = """full_name,email,roll_number,student_id,class_code,password
Devan Patel,202501100091@test.edu,CS-191,202501100091,CS-3A,Student@123
Priya Joshi,202501100092@test.edu,CS-192,202501100092,CS-3A,Student@123
"""
    data = {
        "file": (io.BytesIO(csv_data.encode("utf-8")), "students.csv"),
    }

    res = client.post(
        "/api/v1/admin/students/import-csv",
        headers=admin_headers,
        data=data,
        content_type="multipart/form-data",
    )
    assert res.status_code == 201
    assert res.json["data"]["imported_count"] == 2

    # Verify database
    u1 = User.query.filter_by(email="202501100091@test.edu").first()
    assert u1 is not None
    assert u1.role == "student"
    assert u1.student_profile is not None
    assert u1.student_profile.roll_number == "CS-191"


def test_bulk_csv_faculty_import(client, init_database):
    """Verifies that administrator can bulk import faculty from CSV."""
    admin_token = login(client, "admin@test.edu", "Admin@123")
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    csv_data = """full_name,email,faculty_id,department,designation,phone,password
Dr. Raman Kumar,rkumar@test.edu,FAC099,Computer Science,Associate Professor,9988776655,Faculty@123
"""
    data = {
        "file": (io.BytesIO(csv_data.encode("utf-8")), "faculty.csv"),
    }

    res = client.post(
        "/api/v1/admin/faculty/import-csv",
        headers=admin_headers,
        data=data,
        content_type="multipart/form-data",
    )
    assert res.status_code == 201
    assert res.json["data"]["imported_count"] == 1

    u = User.query.filter_by(email="rkumar@test.edu").first()
    assert u is not None
    assert u.role == "faculty"
    assert u.faculty_profile.faculty_id == "FAC099"
