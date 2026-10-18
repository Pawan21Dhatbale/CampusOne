"""Tests for authentication, token generation, refresh, and logout."""
from tests.conftest import get_token_for
from app.models.user import User
from app.extensions import db


def test_login_success(client, init_database):
    """Verifies that all roles can log in and receive tokens and user info."""
    roles = [
        ("admin@test.edu", "Admin@123", "admin"),
        ("faculty1@test.edu", "Faculty@123", "faculty"),
        ("student1@test.edu", "Student@123", "student"),
        ("parent1@test.edu", "Parent@123", "parent"),
    ]
    for email, pwd, expected_role in roles:
        res = client.post("/api/v1/auth/login", json={"email": email, "password": pwd})
        assert res.status_code == 200
        data = res.get_json()
        assert data["success"] is True
        assert "access_token" in data["data"]
        assert data["data"]["user"]["role"] == expected_role


def test_login_wrong_password(client, init_database):
    """Verifies that invalid password returns 401."""
    res = client.post("/api/v1/auth/login", json={"email": "admin@test.edu", "password": "WrongPassword"})
    assert res.status_code == 401
    assert res.get_json()["success"] is False


def test_login_deactivated_account(client, init_database):
    """Verifies that deactivated account cannot log in."""
    # Deactivate student 1
    u = User.query.filter_by(email="student1@test.edu").first()
    u.is_active = False
    db.session.commit()

    res = client.post("/api/v1/auth/login", json={"email": "student1@test.edu", "password": "Student@123"})
    assert res.status_code == 403
    assert res.get_json()["error_code"] == "ACCOUNT_DEACTIVATED"


def test_me_endpoint(client, init_database):
    """Verifies that /api/v1/auth/me returns current user info."""
    token = get_token_for(client, "faculty1@test.edu", "Faculty@123")
    res = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    data = res.get_json()["data"]["user"]
    assert data["email"] == "faculty1@test.edu"
    assert data["role"] == "faculty"
    assert "faculty_profile" in data


def test_logout_revokes_token(client, init_database):
    """Verifies that logged out token is revoked and cannot be used."""
    token = get_token_for(client, "admin@test.edu", "Admin@123")
    # Call logout
    res = client.post("/api/v1/auth/logout", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200

    # Try accessing protected endpoint
    res2 = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert res2.status_code == 401
    assert res2.get_json()["error_code"] == "TOKEN_REVOKED"


def test_direct_registration_and_immediate_login(client, init_database):
    """Verifies user registration instantly activates account, allowing direct login without email verification."""
    # 1. Register a student with institutional email domain
    reg_res = client.post("/api/v1/auth/register", json={
        "full_name": "Test Fresh User",
        "email": "freshstudent@test.edu",
        "password": "Password@123",
        "role": "student"
    })
    assert reg_res.status_code == 201
    assert reg_res.get_json()["data"]["requires_verification"] is False

    # 2. Confirm user is immediately active and verified in database
    user = User.query.filter_by(email="freshstudent@test.edu").first()
    assert user is not None
    assert user.is_email_verified is True

    # 3. Direct login succeeds immediately without verification tokens
    login_success = client.post("/api/v1/auth/login", json={
        "email": "freshstudent@test.edu",
        "password": "Password@123"
    })
    assert login_success.status_code == 200
    assert "access_token" in login_success.get_json()["data"]


def test_login_blocks_non_institutional_email(client, init_database):
    """Verifies that non-institutional emails (e.g. @gmail.com) are rejected at login."""
    res = client.post("/api/v1/auth/login", json={
        "email": "user@gmail.com",
        "password": "Password@123"
    })
    assert res.status_code == 403
    assert res.get_json()["error_code"] == "INVALID_INSTITUTIONAL_EMAIL"


def test_login_blocks_invalid_prn_digit_length(client, init_database):
    """Verifies that numeric email prefixes that are not 12 digits are rejected at login."""
    # 9 digits instead of 12 digits
    res = client.post("/api/v1/auth/login", json={
        "email": "202501100@mitaoe.ac.in",
        "password": "Password@123"
    })
    assert res.status_code == 400
    assert res.get_json()["error_code"] == "INVALID_PRN_FORMAT"


def test_registration_with_mitaoe_prn_format(client, init_database):
    """Verifies that 12-digit PRN @mitaoe.ac.in registers successfully and extracts PRN."""
    # Invalid PRN format (not 12 digits)
    bad_res = client.post("/api/v1/auth/register", json={
        "full_name": "Bad PRN",
        "email": "invalidprn@mitaoe.ac.in",
        "password": "Password@123",
        "role": "student"
    })
    assert bad_res.status_code == 400
    assert bad_res.get_json()["error_code"] == "INVALID_PRN_EMAIL"

    # Valid 12-digit PRN email (202501100063@mitaoe.ac.in)
    good_res = client.post("/api/v1/auth/register", json={
        "full_name": "MIT AOE Student",
        "email": "202501100063@mitaoe.ac.in",
        "password": "Password@123",
        "role": "student"
    })
    assert good_res.status_code == 201
    data = good_res.get_json()["data"]
    assert data["requires_verification"] is False
    assert data["user"]["is_active"] is True
    assert data["user"]["is_email_verified"] is True

    # Confirm user record in DB has PRN mapped and is already verified
    user = User.query.filter_by(email="202501100063@mitaoe.ac.in").first()
    assert user is not None
    assert user.is_email_verified is True
    assert user.student_profile is not None
    assert user.student_profile.student_id == "202501100063"


