# SmartAttend — Database Design Specification

## 1. Overview
SmartAttend utilizes a normalized relational database schema implemented via **SQLAlchemy ORM** and configured for **PostgreSQL** (with optional zero-config SQLite development fallback). The design enforces database-level integrity, role separation, timetable scheduling constraints, and an absent-first attendance tracking system.

---

## 2. Entity-Relationship Diagram (ERD)

```mermaid
erDiagram
    User ||--o| StudentProfile : "has"
    User ||--o| FacultyProfile : "has"
    User ||--o| ParentProfile : "has"
    User ||--o{ Notification : "receives"
    User ||--o{ AuditLog : "triggers"

    ParentProfile ||--o{ ParentStudentRelationship : "monitors"
    StudentProfile ||--o{ ParentStudentRelationship : "is monitored by"

    AcademicYear ||--o{ Semester : "contains"
    Semester ||--o{ Class : "has"
    Semester ||--o{ Subject : "has"

    Class ||--o{ StudentProfile : "enrolled students"
    Class ||--o{ StudentEnrollment : "enrollment records"
    StudentProfile ||--o{ StudentEnrollment : "enrolls"

    FacultyProfile ||--o{ FacultySubjectAssignment : "teaches"
    Subject ||--o{ FacultySubjectAssignment : "assigned to"
    Class ||--o{ FacultySubjectAssignment : "taught in"

    Class ||--o{ TimetableEntry : "class schedule"
    Subject ||--o{ TimetableEntry : "subject schedule"
    FacultyProfile ||--o{ TimetableEntry : "faculty schedule"

    TimetableEntry ||--o{ AttendanceSession : "generates"
    AttendanceSession ||--o{ AttendanceRecord : "records marks"
    StudentProfile ||--o{ AttendanceRecord : "receives mark"
```

---

## 3. Core Database Entities

### 3.1 `users`
Central authentication table for all system accounts.
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | Integer | Primary Key | Unique user identifier |
| `full_name` | String(120) | Not Null | User's full legal name |
| `email` | String(120) | Unique, Index, Not Null | Unique login email |
| `username` | String(80) | Unique, Index, Nullable | Optional unique login username |
| `password_hash`| String(255) | Not Null | Bcrypt password hash |
| `role` | String(20) | Index, Not Null | Role: `admin`, `faculty`, `student`, `parent` |
| `is_active` | Boolean | Not Null, Default True | Account activation state |
| `created_at` | DateTime | Default UTC | Account creation timestamp |
| `updated_at` | DateTime | Auto-update UTC | Account last updated timestamp |

### 3.2 `student_profiles`
Specialized academic information for student users.
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | Integer | Primary Key | Unique student profile ID |
| `user_id` | Integer | FK(`users.id`), Unique, Cascade | Linked user account |
| `student_id` | String(50) | Unique, Index, Not Null | E.g. `STU2025001` |
| `roll_number` | String(50) | Index, Not Null | E.g. `CS-101` |
| `class_id` | Integer | FK(`classes.id`), Nullable | Current active class assignment |
| `admission_date` | Date | Nullable | Admission date |

### 3.3 `faculty_profiles`
Specialized academic information for instructors.
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | Integer | Primary Key | Unique faculty profile ID |
| `user_id` | Integer | FK(`users.id`), Unique, Cascade | Linked user account |
| `faculty_id` | String(50) | Unique, Index, Not Null | E.g. `FAC2025001` |
| `department` | String(100)| Not Null | Academic department |
| `designation` | String(100)| Default "Assistant Professor" | Academic title |
| `phone` | String(20) | Nullable | Contact telephone number |

### 3.4 `parent_profiles` & `parent_student_relationships`
Allows parents to securely monitor their linked student(s).
* **Table `parent_student_relationships`**:
  * `parent_id` (FK to `parent_profiles.id`)
  * `student_id` (FK to `student_profiles.id`)
  * `relationship_type` (e.g., Father, Mother, Guardian)
  * **Composite Unique Constraint**: `(parent_id, student_id)` prevents duplicate linkages.

### 3.5 `timetable_entries`
Defines weekly lecture schedules with conflict validation.
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | Integer | Primary Key | Slot ID |
| `class_id` | Integer | FK(`classes.id`), Not Null | Class receiving lecture |
| `subject_id` | Integer | FK(`subjects.id`), Not Null | Course being taught |
| `faculty_id` | Integer | FK(`faculty_profiles.id`), Not Null | Instructor teaching |
| `day_of_week` | String(15) | Not Null, Index | Day (Monday – Saturday) |
| `start_time` | Time | Not Null | E.g. `09:00:00` |
| `end_time` | Time | Not Null | E.g. `10:00:00` |
| `room_number` | String(50) | Nullable | Lecture hall or lab number |
| `is_active` | Boolean | Not Null, Default True | Slot active flag |

### 3.6 `attendance_sessions`
Represents an attendance event for a specific scheduled lecture instance on a given date.
* **Composite Unique Constraint**: `(timetable_entry_id, lecture_date)`
  * Guarantees that duplicate attendance sessions cannot be created for the same lecture on the same date.
* Status: `SCHEDULED`, `FINALIZED`, `CANCELLED`.
* Tracks `submitted_by_id` and `submitted_at`.

### 3.7 `attendance_records`
Individual student attendance status for a finalized session.
* **Composite Unique Constraint**: `(session_id, student_id)`
  * Enforces exactly one record per student per lecture.
* Status: `PRESENT`, `ABSENT`, `LEAVE`.

---

## 4. Attendance Calculation Integrity

1. **Course Attendance Rate**:
   $$\text{Subject Attendance} = \left( \frac{\text{Present Lectures}}{\text{Finalized Lectures Conducted for Subject}} \right) \times 100$$
2. **Lecture-Weighted Overall Attendance**:
   $$\text{Overall Attendance} = \left( \frac{\sum \text{Present Lectures}}{\sum \text{Finalized Lectures}} \right) \times 100$$
   * Avoids distorted averages of subjects with different lecture counts.
3. **Attendance Shortage Mathematical Model**:
   Given current present lectures $P$, total finalized lectures $T$, and minimum target ratio $R \in (0, 1)$:
   $$\frac{P + x}{T + x} \ge R \implies x = \left\lceil \frac{R \cdot T - P}{1 - R} \right\rceil$$
   For target $75\%$ ($R = 0.75$), if $0.75 \cdot T - P \le 0$, then $x = 0$ (student already meets threshold).
