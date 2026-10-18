"""Role-Based Access Control (RBAC) tests ensuring boundary isolation."""
from tests.conftest import get_token_for


def test_student_cannot_access_admin_dashboard(client, init_database):
    """Students attempting to access admin APIs must receive 403 Forbidden."""
    token = get_token_for(client, "student1@test.edu", "Student@123")
    res = client.get("/api/v1/admin/dashboard", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 403
    assert res.get_json()["error_code"] == "FORBIDDEN_ROLE"


def test_faculty_cannot_access_admin_students(client, init_database):
    """Faculty members attempting to access admin CRUD must receive 403 Forbidden."""
    token = get_token_for(client, "faculty1@test.edu", "Faculty@123")
    res = client.get("/api/v1/admin/students", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 403
    assert res.get_json()["error_code"] == "FORBIDDEN_ROLE"


def test_parent_cannot_access_faculty_endpoints(client, init_database):
    """Parents attempting to access faculty routes must receive 403 Forbidden."""
    token = get_token_for(client, "parent1@test.edu", "Parent@123")
    res = client.get("/api/v1/faculty/timetable", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 403


def test_admin_can_access_admin_endpoints(client, init_database):
    """Authorized admin can access admin dashboard."""
    token = get_token_for(client, "admin@test.edu", "Admin@123")
    res = client.get("/api/v1/admin/dashboard", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    assert res.get_json()["success"] is True


def test_unauthenticated_requests_blocked(client, init_database):
    """Requests with no auth header must receive 401 Unauthorized."""
    endpoints = [
        "/api/v1/admin/dashboard",
        "/api/v1/faculty/dashboard",
        "/api/v1/student/dashboard",
        "/api/v1/parent/dashboard",
    ]
    for ep in endpoints:
        res = client.get(ep)
        assert res.status_code == 401
