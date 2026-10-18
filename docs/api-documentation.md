# SmartAttend — REST API Documentation

All API endpoints are versioned with the base path prefix:
```
/api/v1
```

All responses conform to the standard SmartAttend JSON schema:
```json
{
  "success": true,
  "message": "Human readable status message",
  "data": { ... }
}
```

---

## 1. Authentication Endpoints

### `POST /api/v1/auth/login`
Authenticates a user and issues JWT tokens.
* **Request Body**:
  ```json
  {
    "email": "faculty1@college.edu",
    "password": "Faculty@123"
  }
  ```
* **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Welcome back, Prof. Alan Turing!",
    "data": {
      "access_token": "eyJhbGciOi...",
      "refresh_token": "eyJhbGciOi...",
      "user": {
        "id": 2,
        "full_name": "Prof. Alan Turing",
        "email": "faculty1@college.edu",
        "role": "faculty",
        "faculty_profile": { ... }
      }
    }
  }
  ```

### `POST /api/v1/auth/logout`
Revokes current JWT token by registering `jti` in `token_blocklist`. Requires Bearer Token.

### `GET /api/v1/auth/me`
Retrieves current authenticated user's profile and permissions. Requires Bearer Token.

---

## 2. Admin Endpoints (`role: admin`)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/admin/dashboard` | Returns KPI cards, 7-day daily trends, class attendance rates, and recent audit trail. |
| `GET` | `/api/v1/admin/students` | Lists students with optional `class_id` or `search` query. |
| `POST`| `/api/v1/admin/students` | Registers new student user and profile. |
| `DELETE` | `/api/v1/admin/students/<id>` | Deactivates a student account. |
| `GET` | `/api/v1/admin/faculty` | Lists faculty members. |
| `POST`| `/api/v1/admin/faculty` | Registers new faculty member. |
| `GET` | `/api/v1/admin/classes` | Lists academic classes and sections. |
| `POST`| `/api/v1/admin/classes` | Creates new class section. |
| `GET` | `/api/v1/admin/subjects` | Lists subjects. |
| `POST`| `/api/v1/admin/subjects` | Creates new subject. |
| `GET` | `/api/v1/admin/timetable` | Lists scheduled timetable entries. |
| `POST`| `/api/v1/admin/timetable` | Creates a lecture slot after checking class, faculty, and room conflicts. |
| `DELETE` | `/api/v1/admin/timetable/<id>` | Deactivates slot while preserving historical attendance. |
| `GET` | `/api/v1/admin/attendance/sessions` | Lists finalized attendance sessions. |
| `GET` | `/api/v1/admin/attendance/export-csv` | Streams institutional attendance data as a downloadable CSV. |

---

## 3. Faculty Endpoints (`role: faculty`)

### `GET /api/v1/faculty/dashboard`
Returns today's scheduled lectures, assigned courses count, and finalized session totals.

### `GET /api/v1/faculty/timetable`
Returns personal timetable filtered strictly by authenticated faculty member's ID.

### `GET /api/v1/faculty/lectures/<id>/students?date=YYYY-MM-DD`
Retrieves authoritative enrolled student roster for the lecture. Validates that the lecture belongs to the faculty member.

### `POST /api/v1/faculty/lectures/<id>/attendance`
**Absent-First Attendance Submission**:
* **Request Body**:
  ```json
  {
    "date": "2025-10-14",
    "absent_student_ids": [102, 105],
    "notes": "Lecture 14 on Binary Search Trees"
  }
  ```
* **Process**:
  1. Validates faculty ownership of the lecture.
  2. Queries authoritative class enrollment from database.
  3. Validates submitted absent IDs against enrolled roster.
  4. Marks absent students as `ABSENT`, all others as `PRESENT`.
  5. Commits `AttendanceSession` and `AttendanceRecord`s within an atomic database transaction.
  6. Dispatches in-app notifications to absent students and their parents.
* **Success Response (201 Created)**.
* **Duplicate Protection (409 Conflict)** if already submitted for date.

---

## 4. Student Endpoints (`role: student`)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/student/dashboard` | Returns overall attendance percentage, KPI cards, and subject summaries. |
| `GET` | `/api/v1/student/attendance/summary` | Subject-wise breakdown with progress status. |
| `GET` | `/api/v1/student/attendance/history` | Chronological log with subject and status filters. |
| `GET` | `/api/v1/student/timetable` | Personal weekly class schedule. |
| `GET` | `/api/v1/student/shortage-calculator` | Calculates consecutive lectures needed: $(P + x)/(T + x) \ge R$. |

---

## 5. Parent Endpoints (`role: parent`)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/parent/dashboard` | Retrieves list of linked children and attendance metrics for selected child. |
| `GET` | `/api/v1/parent/children` | Returns only students explicitly linked to the parent account. |
| `GET` | `/api/v1/parent/children/<id>/attendance/summary` | Subject-wise summary for authorized child. Strict 403 enforcement for unlinked students. |
| `GET` | `/api/v1/parent/children/<id>/attendance/weekly` | Aggregated weekly performance report across past weeks with subject breakdown. |
| `GET` | `/api/v1/parent/children/<id>/attendance/history` | Chronological attendance history for the child. |
| `GET` | `/api/v1/parent/children/<id>/timetable` | Child's weekly class schedule. |
