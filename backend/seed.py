"""Idempotent development seed script for SmartAttend.
Creates administrator, faculty, students, parents, timetables, and sample attendance records.
"""
from datetime import datetime, date, time, timedelta
from app import create_app
from app.extensions import db
from app.models.user import User, StudentProfile, FacultyProfile, ParentProfile, ParentStudentRelationship
from app.models.academic import AcademicYear, Semester, Class, Subject, StudentEnrollment, FacultySubjectAssignment
from app.models.timetable import TimetableEntry
from app.models.attendance import AttendanceSession, AttendanceRecord
from app.models.system import Notification, SystemSetting, AuditLog


def seed_data():
    app = create_app()
    with app.app_context():
        print("[SmartAttend Seeder] Initializing database tables...")
        db.create_all()

        # ==========================================
        # 1. ACADEMIC YEAR & SEMESTER
        # ==========================================
        ay = AcademicYear.query.filter_by(name="2025-2026").first()
        if not ay:
            ay = AcademicYear(
                name="2025-2026",
                start_date=date(2025, 8, 1),
                end_date=date(2026, 5, 31),
                is_current=True,
            )
            db.session.add(ay)
            db.session.flush()
            print("  + Created Academic Year: 2025-2026")

        sem = Semester.query.filter_by(name="Fall Semester 2025").first()
        if not sem:
            sem = Semester(
                academic_year_id=ay.id,
                name="Fall Semester 2025",
                semester_number=5,
                is_active=True,
            )
            db.session.add(sem)
            db.session.flush()
            print("  + Created Semester: Fall Semester 2025 (Sem 5)")

        # ==========================================
        # 2. CLASSES
        # ==========================================
        classes_data = [
            {"name": "B.Tech Computer Engineering", "code": "CS-3A", "section": "A", "capacity": 60},
            {"name": "B.Tech Computer Engineering", "code": "CS-3B", "section": "B", "capacity": 60},
            {"name": "B.Tech Information Technology", "code": "IT-3A", "section": "A", "capacity": 50},
        ]
        classes_map = {}
        for c_info in classes_data:
            cls = Class.query.filter_by(code=c_info["code"], section=c_info["section"]).first()
            if not cls:
                cls = Class(
                    name=c_info["name"],
                    code=c_info["code"],
                    section=c_info["section"],
                    semester_id=sem.id,
                    capacity=c_info["capacity"],
                )
                db.session.add(cls)
                db.session.flush()
                print(f"  + Created Class: {cls.code}-{cls.section}")
            classes_map[cls.code] = cls

        # ==========================================
        # 3. SUBJECTS
        # ==========================================
        subjects_data = [
            {"code": "CS301", "name": "Data Structures", "credits": 4, "desc": "Advanced data structures and complexity analysis."},
            {"code": "CS302", "name": "Applied Mathematics", "credits": 4, "desc": "Relational algebra, SQL, indexing, and normalization."},
            {"code": "CS303", "name": "Computer Organization and Architecture", "credits": 2, "desc": "Full-stack web architecture, React, and REST APIs."},
            {"code": "CS304", "name": "Computer Graphics", "credits": 2, "desc": "TCP/IP layers, routing algorithms, and network protocols."},
            {"code": "CS305", "name": "Enterprise Software Engineering", "credits": 2, "desc": "Processes, threads, memory paging, and concurrency."},
        ]
        subjects_map = {}
        for s_info in subjects_data:
            sub = Subject.query.filter_by(code=s_info["code"]).first()
            if not sub:
                sub = Subject(
                    code=s_info["code"],
                    name=s_info["name"],
                    description=s_info["desc"],
                    credits=s_info["credits"],
                    semester_id=sem.id,
                    is_active=True,
                )
                db.session.add(sub)
                db.session.flush()
                print(f"  + Created Subject: {sub.code} - {sub.name}")
            subjects_map[sub.code] = sub

        # ==========================================
        # 4. SUPER ADMIN ACCOUNT
        # ==========================================
        admin_user = User.query.filter_by(email="admin@college.edu").first()
        if not admin_user:
            admin_user = User(
                full_name="Dr. Eleanor Vance (Dean)",
                email="admin@college.edu",
                username="admin",
                role="admin",
                is_active=True,
            )
            admin_user.set_password("Admin@123")
            db.session.add(admin_user)
            db.session.flush()
            print("  + Created Admin Account: admin@college.edu / Admin@123")

        # ==========================================
        # 5. FACULTY ACCOUNTS
        # ==========================================
        faculty_seed = [
            {
                "full_name": "Prof.Pramod Ganjewar",
                "email": "faculty1@college.edu",
                "username": "faculty1",
                "faculty_id": "FAC2025001",
                "department": "Computer Engineering",
                "designation": "Professor & HOD",
                "phone": "+1-555-0101",
            },
            {
                "full_name": "Prof. Chaitanya Patil",
                "email": "faculty2@college.edu",
                "username": "faculty2",
                "faculty_id": "FAC2025002",
                "department": "Computer Engineering",
                "designation": "Associate Professor",
                "phone": "+1-555-0102",
            },
            {
                "full_name": "Prof. Donald Knuth",
                "email": "faculty3@college.edu",
                "username": "faculty3",
                "faculty_id": "FAC2025003",
                "department": "Information Technology",
                "designation": "Assistant Professor",
                "phone": "+1-555-0103",
            },
        ]

        faculty_profiles_map = {}
        for f_data in faculty_seed:
            f_user = User.query.filter_by(email=f_data["email"]).first()
            if not f_user:
                f_user = User(
                    full_name=f_data["full_name"],
                    email=f_data["email"],
                    username=f_data["username"],
                    role="faculty",
                    is_active=True,
                )
                f_user.set_password("Faculty@123")
                db.session.add(f_user)
                db.session.flush()

                f_prof = FacultyProfile(
                    user_id=f_user.id,
                    faculty_id=f_data["faculty_id"],
                    department=f_data["department"],
                    designation=f_data["designation"],
                    phone=f_data["phone"],
                )
                db.session.add(f_prof)
                db.session.flush()
                print(f"  + Created Faculty: {f_user.email} / Faculty@123 ({f_data['full_name']})")
            else:
                f_prof = f_user.faculty_profile
            faculty_profiles_map[f_data["faculty_id"]] = f_prof

        # ==========================================
        # 6. FACULTY SUBJECT ASSIGNMENTS
        # ==========================================
        assignments = [
            # Turing -> CS301 (Data Structures) for CS-3A
            (faculty_profiles_map["FAC2025001"].id, subjects_map["CS301"].id, classes_map["CS-3A"].id),
            # Turing -> CS305 (Operating Systems) for CS-3B
            (faculty_profiles_map["FAC2025001"].id, subjects_map["CS305"].id, classes_map["CS-3B"].id),
            # Hopper -> CS302 (DBMS) for CS-3A
            (faculty_profiles_map["FAC2025002"].id, subjects_map["CS302"].id, classes_map["CS-3A"].id),
            # Hopper -> CS303 (Web Dev) for IT-3A
            (faculty_profiles_map["FAC2025002"].id, subjects_map["CS303"].id, classes_map["IT-3A"].id),
            # Knuth -> CS304 (Networks) for CS-3A
            (faculty_profiles_map["FAC2025003"].id, subjects_map["CS304"].id, classes_map["CS-3A"].id),
        ]
        for fac_id, sub_id, cls_id in assignments:
            existing_asgn = FacultySubjectAssignment.query.filter_by(
                faculty_id=fac_id,
                subject_id=sub_id,
                class_id=cls_id,
                academic_year_id=ay.id
            ).first()
            if not existing_asgn:
                asgn = FacultySubjectAssignment(
                    faculty_id=fac_id,
                    subject_id=sub_id,
                    class_id=cls_id,
                    academic_year_id=ay.id,
                    is_active=True,
                )
                db.session.add(asgn)

        # ==========================================
        # 7. STUDENTS (20+ students in CS-3A)
        # ==========================================
        student_names = [
            "Aarav Sharma", "Aditi Patel", "Alexander Wright", "Ananya Iyer", "Arjun Nair",
            "Carlos Rodriguez", "Chloe Bennett", "Devanshi Joshi", "Emily Davis", "Ethan Miller",
            "Fatima Al-Sayed", "Gautam Verma", "Hannah Scott", "Ishaan Malhotra", "Jacob Turner",
            "Kavya Krishnan", "Liam Wilson", "Meera Sen", "Noah Clark", "Pooja Hegde",
            "Rohan Deshmukh", "Sara Ali", "Vikram Rathore", "Zara Khan"
        ]

        student_profiles = []
        for i, name in enumerate(student_names, start=1):
            email = f"student{i}@college.edu"
            roll = f"CS-{100 + i}"
            s_id = f"STU2025{i:03d}"

            s_user = User.query.filter_by(email=email).first()
            if not s_user:
                s_user = User(
                    full_name=name,
                    email=email,
                    username=f"student{i}",
                    role="student",
                    is_active=True,
                )
                s_user.set_password("Student@123")
                db.session.add(s_user)
                db.session.flush()

                s_prof = StudentProfile(
                    user_id=s_user.id,
                    student_id=s_id,
                    roll_number=roll,
                    class_id=classes_map["CS-3A"].id,
                    admission_date=date(2023, 8, 1),
                )
                db.session.add(s_prof)
                db.session.flush()

                # Enrollment
                enroll = StudentEnrollment(
                    student_id=s_prof.id,
                    class_id=classes_map["CS-3A"].id,
                    academic_year_id=ay.id,
                    status="ACTIVE",
                )
                db.session.add(enroll)
                print(f"  + Created Student {i}: {email} / Student@123 (Roll: {roll})")
            else:
                s_prof = s_user.student_profile
            student_profiles.append(s_prof)

        # ==========================================
        # 8. PARENTS & PARENT-STUDENT RELATIONSHIPS
        # ==========================================
        parent_seeds = [
            {"name": "Vikram Sharma", "email": "parent1@example.com", "phone": "+1-555-0201", "student_indices": [0, 1]},  # 2 children: Student 1 & Student 2!
            {"name": "Priya Patel", "email": "parent2@example.com", "phone": "+1-555-0202", "student_indices": [2]},      # Student 3
            {"name": "Marcus Wright", "email": "parent3@example.com", "phone": "+1-555-0203", "student_indices": [3]},    # Student 4
            {"name": "Sita Iyer", "email": "parent4@example.com", "phone": "+1-555-0204", "student_indices": [4]},        # Student 5
            {"name": "Ramesh Nair", "email": "parent5@example.com", "phone": "+1-555-0205", "student_indices": [5]},      # Student 6
        ]

        for p_info in parent_seeds:
            p_user = User.query.filter_by(email=p_info["email"]).first()
            if not p_user:
                p_user = User(
                    full_name=p_info["name"],
                    email=p_info["email"],
                    username=p_info["email"].split("@")[0],
                    role="parent",
                    is_active=True,
                )
                p_user.set_password("Parent@123")
                db.session.add(p_user)
                db.session.flush()

                p_prof = ParentProfile(
                    user_id=p_user.id,
                    phone_number=p_info["phone"],
                    occupation="Professional",
                    address="123 Academic Way, Metro City",
                )
                db.session.add(p_prof)
                db.session.flush()

                # Link children
                for idx in p_info["student_indices"]:
                    target_student = student_profiles[idx]
                    link = ParentStudentRelationship(
                        parent_id=p_prof.id,
                        student_id=target_student.id,
                        relationship_type="Father" if "Vikram" in p_info["name"] or "Marcus" in p_info["name"] or "Ramesh" in p_info["name"] else "Mother",
                    )
                    db.session.add(link)
                print(f"  + Created Parent: {p_info['email']} / Parent@123 (Linked to {[student_profiles[idx].user.full_name for idx in p_info['student_indices']]})")

        # ==========================================
        # 9. TIMETABLE ENTRIES (Mon - Fri)
        # ==========================================
        timetable_data = [
            # Monday
            ("Monday", time(9, 0), time(10, 0), "CS-3A", "CS301", "FAC2025001", "Room 301"),
            ("Monday", time(10, 15), time(11, 15), "CS-3A", "CS302", "FAC2025002", "Room 301"),
            ("Monday", time(11, 30), time(12, 30), "CS-3A", "CS304", "FAC2025003", "Room 302"),
            # Tuesday
            ("Tuesday", time(9, 0), time(10, 0), "CS-3A", "CS302", "FAC2025002", "Room 301"),
            ("Tuesday", time(10, 15), time(11, 15), "CS-3A", "CS301", "FAC2025001", "Room 301"),
            # Wednesday
            ("Wednesday", time(9, 0), time(10, 0), "CS-3A", "CS304", "FAC2025003", "Room 301"),
            ("Wednesday", time(10, 15), time(11, 15), "CS-3A", "CS302", "FAC2025002", "Room 301"),
            ("Wednesday", time(14, 0), time(15, 0), "CS-3B", "CS305", "FAC2025001", "Room 303"),
            # Thursday
            ("Thursday", time(9, 0), time(10, 0), "CS-3A", "CS301", "FAC2025001", "Room 301"),
            ("Thursday", time(11, 30), time(12, 30), "CS-3A", "CS304", "FAC2025003", "Room 301"),
            # Friday
            ("Friday", time(9, 0), time(10, 0), "CS-3A", "CS302", "FAC2025002", "Room 301"),
            ("Friday", time(10, 15), time(11, 15), "CS-3A", "CS301", "FAC2025001", "Room 301"),
        ]

        timetable_entries_list = []
        for day, s_time, e_time, cls_code, sub_code, fac_id, room in timetable_data:
            entry = TimetableEntry.query.filter_by(
                day_of_week=day,
                start_time=s_time,
                class_id=classes_map[cls_code].id,
                subject_id=subjects_map[sub_code].id,
            ).first()

            if not entry:
                entry = TimetableEntry(
                    day_of_week=day,
                    start_time=s_time,
                    end_time=e_time,
                    class_id=classes_map[cls_code].id,
                    subject_id=subjects_map[sub_code].id,
                    faculty_id=faculty_profiles_map[fac_id].id,
                    room_number=room,
                    academic_year_id=ay.id,
                    is_active=True,
                )
                db.session.add(entry)
                db.session.flush()
            timetable_entries_list.append(entry)

        # ==========================================
        # 10. REALISTIC PAST ATTENDANCE SESSIONS & RECORDS
        # ==========================================
        today = date.today()
        # Seed sessions over past 2 weeks
        print("  + Generating past finalized attendance sessions and student marks...")
        for days_back in range(14, 0, -1):
            past_date = today - timedelta(days=days_back)
            past_day_name = past_date.strftime("%A")

            # Find timetable entries matching this day
            day_entries = [e for e in timetable_entries_list if e.day_of_week == past_day_name]
            for entry in day_entries:
                existing_session = AttendanceSession.query.filter_by(
                    timetable_entry_id=entry.id,
                    lecture_date=past_date
                ).first()

                if not existing_session:
                    session = AttendanceSession(
                        timetable_entry_id=entry.id,
                        lecture_date=past_date,
                        status="FINALIZED",
                        submitted_by_id=entry.faculty.user_id,
                        submitted_at=datetime.combine(past_date, entry.end_time),
                        submission_notes=f"Lecture on {entry.subject.name} completed.",
                    )
                    db.session.add(session)
                    db.session.flush()

                    # Mark student records:
                    # Give students realistic attendance:
                    # Student 0, 1: ~90% attendance
                    # Student 2: ~72% (below threshold to trigger shortage warning!)
                    # Others: ~85%
                    for idx, student in enumerate(student_profiles[:20]):
                        # Deterministic simulated absence
                        is_absent = False
                        if idx == 2 and (days_back % 2 == 0):  # Student 3 has high absence
                            is_absent = True
                        elif idx == 3 and (days_back % 3 == 0):
                            is_absent = True
                        elif (idx + days_back) % 7 == 0:
                            is_absent = True

                        rec = AttendanceRecord(
                            session_id=session.id,
                            student_id=student.id,
                            status="ABSENT" if is_absent else "PRESENT",
                            marked_at=datetime.combine(past_date, entry.end_time),
                        )
                        db.session.add(rec)

        # ==========================================
        # 11. SAMPLE NOTIFICATIONS & SYSTEM SETTINGS
        # ==========================================
        # Create a shortage notification for Student 3 & Parent 2
        stu3 = student_profiles[2]
        notif = Notification.query.filter_by(user_id=stu3.user_id, notification_type="ATTENDANCE_SHORTAGE").first()
        if not notif:
            notif = Notification(
                user_id=stu3.user_id,
                title="Low Attendance Alert",
                message="Your attendance in Data Structures  is currently 71.4%, which is below the mandatory 75% threshold.",
                notification_type="ATTENDANCE_SHORTAGE",
                is_read=False,
            )
            db.session.add(notif)

        # System settings
        settings = [
            ("MIN_ATTENDANCE_WARNING_THRESHOLD", "75.0", "Minimum attendance percentage threshold for warnings"),
            ("EXCELLENT_ATTENDANCE_THRESHOLD", "85.0", "Threshold for excellent attendance status"),
            ("ALLOW_LATE_SUBMISSION", "False", "Allow attendance submission past 24 hours"),
        ]
        for key, val, desc in settings:
            s_set = SystemSetting.query.filter_by(key=key).first()
            if not s_set:
                db.session.add(SystemSetting(key=key, value=val, description=desc))

        db.session.commit()
        print("\n[SmartAttend Seeder] Finished successfully! Demonstration accounts ready.")
        print("----------------------------------------------------------------------")
        print("ADMINISTRATOR:   admin@college.edu       | Password: Admin@123")
        print("FACULTY 1:       faculty1@college.edu    | Password: Faculty@123")
        print("FACULTY 2:       faculty2@college.edu    | Password: Faculty@123")
        print("FACULTY 3:       faculty3@college.edu    | Password: Faculty@123")
        print("STUDENT 1:       student1@college.edu    | Password: Student@123")
        print("STUDENT 2:       student2@college.edu    | Password: Student@123")
        print("STUDENT 3:       student3@college.edu    | Password: Student@123 (Shortage demo)")
        print("PARENT 1:        parent1@example.com     | Password: Parent@123 (2 children linked)")
        print("PARENT 2:        parent2@example.com     | Password: Parent@123 (Student 3 linked)")
        print("----------------------------------------------------------------------")


if __name__ == "__main__":
    seed_data()
