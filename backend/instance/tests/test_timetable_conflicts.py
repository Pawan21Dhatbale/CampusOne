"""Tests for timetable conflicts: faculty overlaps, class overlaps, and room overlaps."""
from tests.conftest import get_token_for
from app.models.academic import Class, Subject
from app.models.user import FacultyProfile


def test_timetable_faculty_conflict(client, init_database):
    """Prevents a faculty member from being scheduled for two lectures at the same time."""
    admin_token = get_token_for(client, "admin@test.edu", "Admin@123")
    
    cls2 = Class.query.filter_by(code="CS-3B").first()
    sub2 = Subject.query.filter_by(code="CS302").first()
    f1 = FacultyProfile.query.filter_by(faculty_id="FAC001").first()

    # Faculty 1 is already teaching CS-3A on Monday 09:00 - 10:00.
    # Attempting to assign Faculty 1 to CS-3B on Monday 09:30 - 10:30 (overlapping) must fail!
    payload = {
        "class_id": cls2.id,
        "subject_id": sub2.id,
        "faculty_id": f1.id,
        "day_of_week": "Monday",
        "start_time": "09:30",
        "end_time": "10:30",
        "room_number": "Room 500",
    }
    res = client.post("/api/v1/admin/timetable", json=payload, headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 409
    assert "Faculty schedule conflict" in res.get_json()["message"]


def test_timetable_class_conflict(client, init_database):
    """Prevents a class from having two overlapping lectures at the same time."""
    admin_token = get_token_for(client, "admin@test.edu", "Admin@123")
    
    cls1 = Class.query.filter_by(code="CS-3A").first()
    sub2 = Subject.query.filter_by(code="CS302").first()
    f2 = FacultyProfile.query.filter_by(faculty_id="FAC002").first()

    # Class CS-3A already has a lecture on Monday 09:00 - 10:00.
    # Attempting to schedule another lecture for Class CS-3A on Monday 09:00 - 10:00 must fail!
    payload = {
        "class_id": cls1.id,
        "subject_id": sub2.id,
        "faculty_id": f2.id,
        "day_of_week": "Monday",
        "start_time": "09:00",
        "end_time": "10:00",
        "room_number": "Room 309",
    }
    res = client.post("/api/v1/admin/timetable", json=payload, headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 409
    assert "Class schedule conflict" in res.get_json()["message"]


def test_timetable_room_conflict(client, init_database):
    """Prevents two different classes from booking the same room at the same time."""
    admin_token = get_token_for(client, "admin@test.edu", "Admin@123")
    
    cls2 = Class.query.filter_by(code="CS-3B").first()
    sub2 = Subject.query.filter_by(code="CS302").first()
    f2 = FacultyProfile.query.filter_by(faculty_id="FAC002").first()

    # Room 309 is already booked on Monday 09:00 - 10:00.
    # Attempting to book Room 309 for Class CS-3B with Faculty 2 on Monday 09:15 - 10:15 must fail!
    payload = {
        "class_id": cls2.id,
        "subject_id": sub2.id,
        "faculty_id": f2.id,
        "day_of_week": "Monday",
        "start_time": "09:15",
        "end_time": "10:15",
        "room_number": "Room 309",
    }
    res = client.post("/api/v1/admin/timetable", json=payload, headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 409
    assert "Room conflict" in res.get_json()["message"]
