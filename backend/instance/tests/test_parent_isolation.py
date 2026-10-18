"""Tests for parent-child relationship isolation and student privacy protection."""
from tests.conftest import get_token_for
from app.models.user import StudentProfile


def test_parent_child_isolation(client, init_database):
    """
    Verifies that parents can ONLY access their explicitly linked child/children.
    Parent 1 is linked to Student 1 and Student 2.
    Parent 2 is linked to Student 3 only.
    """
    token_p1 = get_token_for(client, "parent1@test.edu", "Parent@123")
    token_p2 = get_token_for(client, "parent2@test.edu", "Parent@123")

    stu1 = StudentProfile.query.filter_by(roll_number="CS-101").first()
    stu2 = StudentProfile.query.filter_by(roll_number="CS-102").first()
    stu3 = StudentProfile.query.filter_by(roll_number="CS-103").first()

    # 1. Parent 1 can access linked Student 1 and Student 2
    res_p1_s1 = client.get(f"/api/v1/parent/children/{stu1.id}/attendance/summary", headers={"Authorization": f"Bearer {token_p1}"})
    assert res_p1_s1.status_code == 200

    res_p1_s2 = client.get(f"/api/v1/parent/children/{stu2.id}/attendance/summary", headers={"Authorization": f"Bearer {token_p1}"})
    assert res_p1_s2.status_code == 200

    # 2. Parent 1 CANNOT access unlinked Student 3 (must return 403 Forbidden)
    res_p1_s3 = client.get(f"/api/v1/parent/children/{stu3.id}/attendance/summary", headers={"Authorization": f"Bearer {token_p1}"})
    assert res_p1_s3.status_code == 403
    assert "not authorized" in res_p1_s3.get_json()["message"].lower()

    # 3. Parent 2 CAN access Student 3
    res_p2_s3 = client.get(f"/api/v1/parent/children/{stu3.id}/attendance/summary", headers={"Authorization": f"Bearer {token_p2}"})
    assert res_p2_s3.status_code == 200

    # 4. Parent 2 CANNOT access Student 1
    res_p2_s1 = client.get(f"/api/v1/parent/children/{stu1.id}/attendance/summary", headers={"Authorization": f"Bearer {token_p2}"})
    assert res_p2_s1.status_code == 403
