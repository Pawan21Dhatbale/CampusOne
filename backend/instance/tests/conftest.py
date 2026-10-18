"""Pytest configuration, fixtures, and database setup."""
import pytest
from datetime import date, time
from app import create_app
from app.extensions import db
from app.models.user import User, StudentProfile, FacultyProfile, ParentProfile, ParentStudentRelationship
from app.models.academic import AcademicYear, Semester, Class, Subject, FacultySubjectAssignment
from app.models.timetable import TimetableEntry


@pytest.fixture(scope="session")
def app():
    """Create test application configured with SQLite in-memory database."""
    app = create_app("testing")
    with app.app_context():
        db.create_all()
        yield app
        db.session.remove()
        db.drop_all()


@pytest.fixture(scope="function")
def client(app):
    """Test client for HTTP requests."""
    return app.test_client()


@pytest.fixture(scope="function")
def init_database(app):
    """Initializes clean database state for each test."""
    with app.app_context():
        db.session.remove()
        db.drop_all()
        db.create_all()

        # 1. Academic Year, Semester, Class, Subject
        ay = AcademicYear(name="2025-2026", start_date=date(2025, 8, 1), end_date=date(2026, 5, 31), is_current=True)
        db.session.add(ay)
        db.session.flush()

        sem = Semester(academic_year_id=ay.id, name="Sem 5", semester_number=5, is_active=True)
        db.session.add(sem)
        db.session.flush()

        cls1 = Class(name="B.Tech Computer  Engineering", code="CS-3A", section="A", semester_id=sem.id, capacity=60)
        cls2 = Class(name="B.Tech Computer  Engineering", code="CS-3B", section="B", semester_id=sem.id, capacity=60)
        db.session.add_all([cls1, cls2])
        db.session.flush()

        sub1 = Subject(code="CS301", name="Data Structures", credits=4, semester_id=sem.id, is_active=True)
        sub2 = Subject(code="CS302", name="Database Systems", credits=4, semester_id=sem.id, is_active=True)
        db.session.add_all([sub1, sub2])
        db.session.flush()

        # 2. Admin User
        admin = User(full_name="Admin User", email="admin@test.edu", username="admin", role="admin", is_active=True)
        admin.set_password("Admin@123")
        db.session.add(admin)

        # 3. Faculty Users
        f1_user = User(full_name="Prof. Turing", email="faculty1@test.edu", username="fac1", role="faculty", is_active=True)
        f1_user.set_password("Faculty@123")
        db.session.add(f1_user)
        db.session.flush()
        f1_prof = FacultyProfile(user_id=f1_user.id, faculty_id="FAC001", department="CS")
        db.session.add(f1_prof)

        f2_user = User(full_name="Prof. Hopper", email="faculty2@test.edu", username="fac2", role="faculty", is_active=True)
        f2_user.set_password("Faculty@123")
        db.session.add(f2_user)
        db.session.flush()
        f2_prof = FacultyProfile(user_id=f2_user.id, faculty_id="FAC002", department="CS")
        db.session.add(f2_prof)
        db.session.flush()

        # 4. Twenty Students in Class 1
        students = []
        for i in range(1, 21):
            s_user = User(full_name=f"Student {i}", email=f"student{i}@test.edu", username=f"stu{i}", role="student", is_active=True)
            s_user.set_password("Student@123")
            db.session.add(s_user)
            db.session.flush()
            s_prof = StudentProfile(user_id=s_user.id, student_id=f"STU{i:03d}", roll_number=f"CS-{100+i}", class_id=cls1.id)
            db.session.add(s_prof)
            students.append(s_prof)
        db.session.flush()

        # 5. Parents
        # Parent 1 linked to Student 1 & 2
        p1_user = User(full_name="Parent One", email="parent1@test.edu", username="parent1", role="parent", is_active=True)
        p1_user.set_password("Parent@123")
        db.session.add(p1_user)
        db.session.flush()
        p1_prof = ParentProfile(user_id=p1_user.id, phone_number="1234567890")
        db.session.add(p1_prof)
        db.session.flush()
        db.session.add(ParentStudentRelationship(parent_id=p1_prof.id, student_id=students[0].id))
        db.session.add(ParentStudentRelationship(parent_id=p1_prof.id, student_id=students[1].id))

        # Parent 2 linked to Student 3 only
        p2_user = User(full_name="Parent Two", email="parent2@test.edu", username="parent2", role="parent", is_active=True)
        p2_user.set_password("Parent@123")
        db.session.add(p2_user)
        db.session.flush()
        p2_prof = ParentProfile(user_id=p2_user.id, phone_number="0987654321")
        db.session.add(p2_prof)
        db.session.flush()
        db.session.add(ParentStudentRelationship(parent_id=p2_prof.id, student_id=students[2].id))

        # 6. Timetable entries:
        # Faculty 1 teaches CS301 to Class CS-3A on Monday 09:00 - 10:00
        tt_entry1 = TimetableEntry(
            day_of_week="Monday",
            start_time=time(9, 0),
            end_time=time(10, 0),
            class_id=cls1.id,
            subject_id=sub1.id,
            faculty_id=f1_prof.id,
            room_number="Room 309",
            is_active=True,
        )
        # Faculty 2 teaches CS302 to Class CS-3A on Tuesday 09:00 - 10:00
        tt_entry2 = TimetableEntry(
            day_of_week="Tuesday",
            start_time=time(9, 0),
            end_time=time(10, 0),
            class_id=cls1.id,
            subject_id=sub2.id,
            faculty_id=f2_prof.id,
            room_number="Room 309",
            is_active=True,
        )
        db.session.add_all([tt_entry1, tt_entry2])
        db.session.commit()

        yield db
        db.session.remove()
        db.drop_all()


def get_token_for(client, email, password):
    """Helper to log in and get JWT access token."""
    res = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    data = res.get_json()
    if res.status_code == 200 and data.get("success"):
        return data["data"]["access_token"]
    return None
