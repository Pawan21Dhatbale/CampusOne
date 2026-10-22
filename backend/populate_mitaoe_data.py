"""
Seed script to populate real academic data for MIT Academy of Engineering (MIT AOE), Alandi, Pune.
- Class: SY B.Tech Computer Engineering, Division A
- Semester: Semester III (Semester 3)
- Academic Year: 2025-2026 (2025-26)
- 12 Faculty user accounts with direct login (password: password123)
- 6 Theory subjects + 7 Practical Lab subjects
- Faculty-Subject assignments
- Timetable entries across the week
- Student enrollments into Division A
"""
import os
import sys
from datetime import date, time

# Add backend directory to sys.path
backend_dir = os.path.abspath(os.path.dirname(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app import create_app
from app.extensions import db
from app.models.user import User, FacultyProfile, StudentProfile
from app.models.academic import AcademicYear, Semester, Class, Subject, FacultySubjectAssignment, StudentEnrollment
from app.models.timetable import TimetableEntry

app = create_app("development")

def seed_mitaoe_academic_data():
    with app.app_context():
        print("1. Checking Academic Year 2025-2026...")
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
        else:
            ay.is_current = True
            db.session.flush()
        print(f"Academic Year: id={ay.id}, name={ay.name}")

        print("\n2. Checking Semester III (Semester 3)...")
        sem3 = Semester.query.filter_by(academic_year_id=ay.id, semester_number=3).first()
        if not sem3:
            sem3 = Semester(
                academic_year_id=ay.id,
                name="Semester III (Autumn 2025)",
                semester_number=3,
                is_active=True,
            )
            db.session.add(sem3)
            db.session.flush()
        print(f"Semester: id={sem3.id}, name={sem3.name}")

        print("\n3. Checking Class: SY B.Tech Computer Engineering - Div A...")
        cls = Class.query.filter_by(code="SY-COMP", section="A", semester_id=sem3.id).first()
        if not cls:
            # Also check if class exists with different code or same name
            cls = Class.query.filter_by(name="SY B.Tech Computer Engineering", section="A").first()
        if not cls:
            cls = Class(
                name="SY B.Tech Computer Engineering",
                code="SY-COMP",
                section="A",
                semester_id=sem3.id,
                capacity=75,
            )
            db.session.add(cls)
            db.session.flush()
        else:
            cls.semester_id = sem3.id
            db.session.flush()
        print(f"Class: id={cls.id}, name={cls.name}, section={cls.section}")

        print("\n4. Provisioning Faculty Accounts with Direct Login (password: password123)...")
        # List of teachers to seed:
        # (full_name, email, username, faculty_id, department, designation, phone)
        faculty_data = [
            (
                "Dr. Pramod Ganjewar",
                "pramodganjewar@mitaoe.ac.in",
                "pramodganjewar",
                "FAC_P_GANJEWAR",
                "Computer Engineering",
                "Associate Professor",
                "9822000001"
            ),
            (
                "Dr. Madhavi Y. Nimkar",
                "madhavinimkar@mitaoe.ac.in",
                "madhavinimkar",
                "FAC_M_NIMKAR",
                "Computer Engineering",
                "Associate Professor",
                "9822000002"
            ),
            (
                "Mr. Chaitanya A. Patil",
                "chaitanyapatil@mitaoe.ac.in",
                "chaitanyapatil",
                "FAC_C_PATIL",
                "Applied Mathematics",
                "Assistant Professor",
                "9822000003"
            ),
            (
                "Ms. Sharmila B. Kharat",
                "sharmilakharat@mitaoe.ac.in",
                "sharmilakharat",
                "FAC_S_KHARAT",
                "Computer Engineering",
                "Assistant Professor",
                "9822000004"
            ),
            (
                "Mr. Pankaj B. Devre",
                "pankajdevre@mitaoe.ac.in",
                "pankajdevre",
                "FAC_P_DEVRE",
                "Humanities & Management",
                "Assistant Professor",
                "9822000005"
            ),
            (
                "Mrs. Bhagyashree R. Alhat",
                "bhagyashreealhat@mitaoe.ac.in",
                "bhagyashreealhat",
                "FAC_B_ALHAT",
                "Universal Human Values",
                "Assistant Professor",
                "9822000006"
            ),
            (
                "Mrs. Pranali P. Lokhande",
                "pranalilokhande@mitaoe.ac.in",
                "pranalilokhande",
                "FAC_P_LOKHANDE",
                "Computer Engineering",
                "Assistant Professor",
                "9822000007"
            ),
            (
                "Dr. Vijaykumar P. Mantri",
                "vijaykumarmantri@mitaoe.ac.in",
                "vijaykumarmantri",
                "FAC_V_MANTRI",
                "Computer Engineering",
                "Associate Professor",
                "9822000008"
            ),
            (
                "Dr. Neha P. Hajare",
                "nehahajare@mitaoe.ac.in",
                "nehahajare",
                "FAC_N_HAJARE",
                "Computer Engineering",
                "Assistant Professor",
                "9822000009"
            ),
            (
                "Mr. Amitkumar A. Shinde",
                "amitkumarshinde@mitaoe.ac.in",
                "amitkumarshinde",
                "FAC_A_SHINDE",
                "Applied Mathematics & ASGE",
                "Assistant Professor & Class Coordinator (Div A)",
                "9822000010"
            ),
            (
                "Prof. S. S.",
                "ss@mitaoe.ac.in",
                "ss_faculty",
                "FAC_SS",
                "Universal Human Values",
                "Assistant Professor (UHV)",
                "9822000011"
            ),
            (
                "Prof. A. P. T.",
                "apt@mitaoe.ac.in",
                "apt_faculty",
                "FAC_APT",
                "Universal Human Values",
                "Assistant Professor (UHV)",
                "9822000012"
            ),
        ]

        faculty_map = {}
        for full_name, email, username, fac_id, dept, desig, phone in faculty_data:
            user = User.query.filter_by(email=email).first()
            if not user:
                user = User(
                    full_name=full_name,
                    email=email,
                    username=username,
                    role="faculty",
                    is_active=True,
                    is_email_verified=True,
                )
                user.set_password("password123")
                db.session.add(user)
                db.session.flush()
                print(f"Created User: {email}")
            else:
                user.full_name = full_name
                user.role = "faculty"
                user.is_active = True
                user.is_email_verified = True
                user.set_password("password123")
                db.session.flush()
                print(f"Updated User: {email}")

            fac_prof = FacultyProfile.query.filter_by(user_id=user.id).first()
            if not fac_prof:
                fac_prof = FacultyProfile(
                    user_id=user.id,
                    faculty_id=fac_id,
                    department=dept,
                    designation=desig,
                    phone=phone,
                )
                db.session.add(fac_prof)
                db.session.flush()
            else:
                fac_prof.faculty_id = fac_id
                fac_prof.department = dept
                fac_prof.designation = desig
                fac_prof.phone = phone
                db.session.flush()
            
            faculty_map[email] = fac_prof
            print(f"  Faculty Profile ready: {fac_id} -> {full_name}")

        print("\n5. Provisioning Theory & Practical Subjects...")
        # Subject definition: (code, name, description, credits, semester_id)
        # Note on ES: Printed as 2304221T (same as COA) with notation '(requires verification)'.
        # Using 2304221T-ES and 2304221L-ES to maintain uniqueness without colliding with COA.
        subjects_data = [
            # Theory
            ("2304212T", "Data Structures (DS)", "Core Theory - Data Structures", 3),
            ("2304218T", "Computer Graphics (CG)", "Core Theory - Computer Graphics", 3),
            ("230125XT", "Applied Mathematics (AM)", "Core Theory - Applied Mathematics", 4),
            ("2304221T", "Computer Organization & Architecture (COA)", "Core Theory - COA", 3),
            ("2304221T-ES", "Entrepreneurship Skills (ES)", "Theory - Entrepreneurship Skills (Printed as 2304221T)", 2),
            ("2301287T", "Universal Human Values-II (UHV-II)", "Theory - Universal Human Values-II", 2),
            # Practical
            ("2304214L", "Programming Lab", "Practical Lab - Programming Lab (DS)", 1),
            ("2304261L", "Problem Solving Using Object-Oriented Programming (C++) (PSOOP)", "Practical Lab - PSOOP C++", 2),
            ("230125XL", "Applied Mathematics Lab", "Practical Lab - AM Lab", 1),
            ("2304221L", "Computer Organization & Architecture Lab (COA Lab)", "Practical Lab - COA Lab", 1),
            ("2304218L", "Computer Graphics Lab (CG Lab)", "Practical Lab - CG Lab", 1),
            ("2304221L-ES", "Entrepreneurship Skills Lab (ES Lab)", "Practical Lab - ES Lab (Printed as 2304221L)", 1),
            ("2301287L", "Universal Human Values-II Lab (UHV-II Lab)", "Practical Lab - UHV-II Lab", 1),
        ]

        subject_map = {}
        for code, name, desc, creds in subjects_data:
            subj = Subject.query.filter_by(code=code, semester_id=sem3.id).first()
            if not subj:
                subj = Subject(
                    code=code,
                    name=name,
                    description=desc,
                    credits=creds,
                    semester_id=sem3.id,
                    is_active=True,
                )
                db.session.add(subj)
                db.session.flush()
                print(f"Created Subject: {code} - {name}")
            else:
                subj.name = name
                subj.description = desc
                subj.credits = creds
                subj.is_active = True
                db.session.flush()
                print(f"Updated Subject: {code} - {name}")
            subject_map[code] = subj

        print("\n6. Assigning Teachers to Subjects and Division A...")
        # Map: subject_code -> list of teacher emails
        assignments = [
            # Theory
            ("2304212T", ["pramodganjewar@mitaoe.ac.in"]),
            ("2304218T", ["madhavinimkar@mitaoe.ac.in"]),
            ("230125XT", ["chaitanyapatil@mitaoe.ac.in"]),
            ("2304221T", ["sharmilakharat@mitaoe.ac.in"]),
            ("2304221T-ES", ["pankajdevre@mitaoe.ac.in"]),
            ("2301287T", ["bhagyashreealhat@mitaoe.ac.in"]),
            # Practical
            ("2304214L", ["pramodganjewar@mitaoe.ac.in"]),
            ("2304261L", ["pranalilokhande@mitaoe.ac.in", "vijaykumarmantri@mitaoe.ac.in", "nehahajare@mitaoe.ac.in"]),
            ("230125XL", ["amitkumarshinde@mitaoe.ac.in", "chaitanyapatil@mitaoe.ac.in"]),
            ("2304221L", ["sharmilakharat@mitaoe.ac.in"]),
            ("2304218L", ["madhavinimkar@mitaoe.ac.in"]),
            ("2304221L-ES", ["pankajdevre@mitaoe.ac.in"]),
            ("2301287L", ["ss@mitaoe.ac.in", "apt@mitaoe.ac.in"]),
        ]

        for code, teacher_emails in assignments:
            subj = subject_map[code]
            for email in teacher_emails:
                fac = faculty_map[email]
                fsa = FacultySubjectAssignment.query.filter_by(
                    faculty_id=fac.id,
                    subject_id=subj.id,
                    class_id=cls.id,
                    academic_year_id=ay.id,
                ).first()
                if not fsa:
                    fsa = FacultySubjectAssignment(
                        faculty_id=fac.id,
                        subject_id=subj.id,
                        class_id=cls.id,
                        academic_year_id=ay.id,
                        is_active=True,
                    )
                    db.session.add(fsa)
                    db.session.flush()
                    print(f"  Assigned {fac.user.full_name} -> {subj.name} ({cls.name} Div {cls.section})")

        print("\n7. Creating Timetable Entries for SY B.Tech Comp Div A...")
        # (day_of_week, start_time, end_time, subject_code, faculty_email, room_number)
        timetable_slots = [
            # Monday
            ("Monday", time(9, 0), time(10, 0), "230125XT", "chaitanyapatil@mitaoe.ac.in", "Room 301"),
            ("Monday", time(10, 0), time(11, 0), "2304212T", "pramodganjewar@mitaoe.ac.in", "Room 301"),
            ("Monday", time(11, 15), time(12, 15), "2304221T", "sharmilakharat@mitaoe.ac.in", "Room 301"),
            ("Monday", time(13, 0), time(15, 0), "2304214L", "pramodganjewar@mitaoe.ac.in", "Programming Lab 1"),
            # Tuesday
            ("Tuesday", time(9, 0), time(10, 0), "2304218T", "madhavinimkar@mitaoe.ac.in", "Room 301"),
            ("Tuesday", time(10, 0), time(11, 0), "230125XT", "chaitanyapatil@mitaoe.ac.in", "Room 301"),
            ("Tuesday", time(11, 15), time(12, 15), "2304221T-ES", "pankajdevre@mitaoe.ac.in", "Room 301"),
            ("Tuesday", time(13, 0), time(15, 0), "2304261L", "pranalilokhande@mitaoe.ac.in", "Software Lab 2"),
            # Wednesday
            ("Wednesday", time(9, 0), time(10, 0), "2304212T", "pramodganjewar@mitaoe.ac.in", "Room 301"),
            ("Wednesday", time(10, 0), time(11, 0), "2304221T", "sharmilakharat@mitaoe.ac.in", "Room 301"),
            ("Wednesday", time(11, 15), time(12, 15), "2301287T", "bhagyashreealhat@mitaoe.ac.in", "Room 301"),
            ("Wednesday", time(13, 0), time(15, 0), "2304218L", "madhavinimkar@mitaoe.ac.in", "Graphics Lab 3"),
            # Thursday
            ("Thursday", time(9, 0), time(10, 0), "2304218T", "madhavinimkar@mitaoe.ac.in", "Room 301"),
            ("Thursday", time(10, 0), time(12, 0), "230125XL", "amitkumarshinde@mitaoe.ac.in", "Maths Computing Lab"),
            ("Thursday", time(13, 0), time(15, 0), "2304221L", "sharmilakharat@mitaoe.ac.in", "Hardware Lab 5"),
            # Friday
            ("Friday", time(9, 0), time(10, 0), "2304212T", "pramodganjewar@mitaoe.ac.in", "Room 301"),
            ("Friday", time(10, 0), time(11, 0), "2304261L", "nehahajare@mitaoe.ac.in", "Software Lab 2"),
            ("Friday", time(11, 15), time(12, 15), "2301287L", "ss@mitaoe.ac.in", "Seminar Room 302"),
            ("Friday", time(13, 0), time(15, 0), "2304221L-ES", "pankajdevre@mitaoe.ac.in", "Incubation Cell"),
            # Saturday (Alternate batch lab)
            ("Saturday", time(9, 0), time(11, 0), "2304261L", "vijaykumarmantri@mitaoe.ac.in", "Software Lab 2"),
            ("Saturday", time(11, 15), time(12, 15), "2301287L", "apt@mitaoe.ac.in", "Seminar Room 302"),
        ]

        for day, st, et, code, email, room in timetable_slots:
            subj = subject_map[code]
            fac = faculty_map[email]
            slot = TimetableEntry.query.filter_by(
                class_id=cls.id,
                subject_id=subj.id,
                faculty_id=fac.id,
                day_of_week=day,
                start_time=st,
            ).first()
            if not slot:
                slot = TimetableEntry(
                    class_id=cls.id,
                    subject_id=subj.id,
                    faculty_id=fac.id,
                    academic_year_id=ay.id,
                    day_of_week=day,
                    start_time=st,
                    end_time=et,
                    room_number=room,
                    is_active=True,
                    status="published",
                )
                db.session.add(slot)
                print(f"  Added Slot: {day} {st.strftime('%H:%M')}-{et.strftime('%H:%M')} -> {subj.name} ({fac.user.full_name})")

        print("\n8. Enrolling existing registered students into Division A...")
        students = StudentProfile.query.all()
        for stu in students:
            stu.class_id = cls.id
            enrollment = StudentEnrollment.query.filter_by(
                student_id=stu.id,
                class_id=cls.id,
                academic_year_id=ay.id,
            ).first()
            if not enrollment:
                enrollment = StudentEnrollment(
                    student_id=stu.id,
                    class_id=cls.id,
                    academic_year_id=ay.id,
                    status="ACTIVE",
                )
                db.session.add(enrollment)
            print(f"  Enrolled Student: {stu.student_id} ({stu.user.full_name}) into {cls.name} Div {cls.section}")

        db.session.commit()
        print("\n=== All academic data successfully populated into Supabase PostgreSQL! ===")

if __name__ == "__main__":
    seed_mitaoe_academic_data()
