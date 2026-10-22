-- ========================================================================
-- SmartAttend - MIT AOE University Management System
-- Supabase PostgreSQL Production Schema & Bootstrap Migration Script
-- ========================================================================

-- Enable standard UUID / cryptographic extensions if required
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. USERS TABLE
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    full_name VARCHAR(120) NOT NULL,
    email VARCHAR(120) UNIQUE NOT NULL,
    username VARCHAR(80) UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL, -- 'admin', 'faculty', 'student', 'parent'
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_email_verified BOOLEAN NOT NULL DEFAULT TRUE,
    verification_token VARCHAR(128),
    reset_token VARCHAR(128),
    reset_token_expiry TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_verification_token ON users(verification_token);
CREATE INDEX IF NOT EXISTS idx_users_reset_token ON users(reset_token);

-- 2. ACADEMIC YEARS
CREATE TABLE IF NOT EXISTS academic_years (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_current BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3. SEMESTERS
CREATE TABLE IF NOT EXISTS semesters (
    id SERIAL PRIMARY KEY,
    academic_year_id INTEGER NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,
    semester_number INTEGER NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_semesters_academic_year ON semesters(academic_year_id);

-- 4. CLASSES
CREATE TABLE IF NOT EXISTS classes (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50) NOT NULL,
    section VARCHAR(10) NOT NULL DEFAULT 'A',
    semester_id INTEGER REFERENCES semesters(id) ON DELETE SET NULL,
    capacity INTEGER DEFAULT 60,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_class_code_section_semester UNIQUE (code, section, semester_id)
);

CREATE INDEX IF NOT EXISTS idx_classes_semester ON classes(semester_id);

-- 5. SUBJECTS
CREATE TABLE IF NOT EXISTS subjects (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(120) NOT NULL,
    description TEXT,
    credits INTEGER NOT NULL DEFAULT 3,
    semester_id INTEGER REFERENCES semesters(id) ON DELETE SET NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_subject_code_semester UNIQUE (code, semester_id)
);

CREATE INDEX IF NOT EXISTS idx_subjects_code ON subjects(code);
CREATE INDEX IF NOT EXISTS idx_subjects_semester ON subjects(semester_id);

-- 6. STUDENT PROFILES (12-digit PRN mapped)
CREATE TABLE IF NOT EXISTS student_profiles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    student_id VARCHAR(50) UNIQUE NOT NULL, -- 12-digit PRN (e.g. 202501100063)
    roll_number VARCHAR(50) NOT NULL,
    class_id INTEGER REFERENCES classes(id) ON DELETE SET NULL,
    admission_date DATE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_student_profiles_student_id ON student_profiles(student_id);
CREATE INDEX IF NOT EXISTS idx_student_profiles_roll ON student_profiles(roll_number);
CREATE INDEX IF NOT EXISTS idx_student_profiles_class ON student_profiles(class_id);

-- 7. FACULTY PROFILES
CREATE TABLE IF NOT EXISTS faculty_profiles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    faculty_id VARCHAR(50) UNIQUE NOT NULL,
    department VARCHAR(100) NOT NULL,
    designation VARCHAR(100) DEFAULT 'Assistant Professor',
    phone VARCHAR(20),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_faculty_profiles_faculty_id ON faculty_profiles(faculty_id);

-- 8. PARENT PROFILES
CREATE TABLE IF NOT EXISTS parent_profiles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    phone_number VARCHAR(20),
    occupation VARCHAR(100),
    address VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 9. PARENT-STUDENT RELATIONSHIPS
CREATE TABLE IF NOT EXISTS parent_student_relationships (
    id SERIAL PRIMARY KEY,
    parent_id INTEGER NOT NULL REFERENCES parent_profiles(id) ON DELETE CASCADE,
    student_id INTEGER NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
    relationship_type VARCHAR(50) DEFAULT 'Parent',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_parent_student UNIQUE (parent_id, student_id)
);

-- 10. STUDENT ENROLLMENTS
CREATE TABLE IF NOT EXISTS student_enrollments (
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
    class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    academic_year_id INTEGER NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
    enrollment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_student_enrollment UNIQUE (student_id, class_id, academic_year_id)
);

-- 11. FACULTY SUBJECT ASSIGNMENTS
CREATE TABLE IF NOT EXISTS faculty_subject_assignments (
    id SERIAL PRIMARY KEY,
    faculty_id INTEGER NOT NULL REFERENCES faculty_profiles(id) ON DELETE CASCADE,
    subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    academic_year_id INTEGER REFERENCES academic_years(id) ON DELETE SET NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_faculty_subject_class UNIQUE (faculty_id, subject_id, class_id)
);

-- 12. TIMETABLE ENTRIES
CREATE TABLE IF NOT EXISTS timetable_entries (
    id SERIAL PRIMARY KEY,
    class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    faculty_id INTEGER NOT NULL REFERENCES faculty_profiles(id) ON DELETE CASCADE,
    day_of_week VARCHAR(15) NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    room_number VARCHAR(50),
    academic_year_id INTEGER REFERENCES academic_years(id) ON DELETE CASCADE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    status VARCHAR(20) NOT NULL DEFAULT 'published',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_timetable_class ON timetable_entries(class_id);
CREATE INDEX IF NOT EXISTS idx_timetable_subject ON timetable_entries(subject_id);
CREATE INDEX IF NOT EXISTS idx_timetable_faculty ON timetable_entries(faculty_id);
CREATE INDEX IF NOT EXISTS idx_timetable_day ON timetable_entries(day_of_week);

-- 13. ATTENDANCE SESSIONS
CREATE TABLE IF NOT EXISTS attendance_sessions (
    id SERIAL PRIMARY KEY,
    timetable_entry_id INTEGER NOT NULL REFERENCES timetable_entries(id) ON DELETE CASCADE,
    lecture_date DATE NOT NULL,
    actual_start_time TIME,
    actual_end_time TIME,
    status VARCHAR(20) NOT NULL DEFAULT 'FINALIZED',
    submitted_by_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    submission_notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_session_timetable_date UNIQUE (timetable_entry_id, lecture_date)
);

CREATE INDEX IF NOT EXISTS idx_sessions_timetable ON attendance_sessions(timetable_entry_id);
CREATE INDEX IF NOT EXISTS idx_sessions_date ON attendance_sessions(lecture_date);

-- 14. ATTENDANCE RECORDS (Absent-First Engine)
CREATE TABLE IF NOT EXISTS attendance_records (
    id SERIAL PRIMARY KEY,
    session_id INTEGER NOT NULL REFERENCES attendance_sessions(id) ON DELETE CASCADE,
    student_id INTEGER NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
    status VARCHAR(15) NOT NULL DEFAULT 'PRESENT', -- 'PRESENT', 'ABSENT', 'EXCUSED'
    marked_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    remarks VARCHAR(255),
    CONSTRAINT uq_session_student_record UNIQUE (session_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_records_session ON attendance_records(session_id);
CREATE INDEX IF NOT EXISTS idx_records_student ON attendance_records(student_id);

-- 15. ATTENDANCE CORRECTION REQUESTS
CREATE TABLE IF NOT EXISTS attendance_correction_requests (
    id SERIAL PRIMARY KEY,
    session_id INTEGER NOT NULL REFERENCES attendance_sessions(id) ON DELETE CASCADE,
    student_id INTEGER NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
    requested_by_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    original_status VARCHAR(15) NOT NULL,
    requested_status VARCHAR(15) NOT NULL,
    reason TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    reviewed_by_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMP,
    review_notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 16. TOKEN BLOCKLIST (Revoked JWTs on Logout)
CREATE TABLE IF NOT EXISTS token_blocklist (
    id SERIAL PRIMARY KEY,
    jti VARCHAR(36) UNIQUE NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_token_blocklist_jti ON token_blocklist(jti);

-- 17. AUDIT LOGS
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id VARCHAR(50),
    details TEXT,
    ip_address VARCHAR(45),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at);

-- 18. NOTIFICATIONS
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(150) NOT NULL,
    message TEXT NOT NULL,
    notification_type VARCHAR(50) NOT NULL DEFAULT 'ANNOUNCEMENT',
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    data_payload TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at);

-- 19. SYSTEM SETTINGS
CREATE TABLE IF NOT EXISTS system_settings (
    id SERIAL PRIMARY KEY,
    key VARCHAR(100) UNIQUE NOT NULL,
    value TEXT NOT NULL,
    description VARCHAR(255),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_system_settings_key ON system_settings(key);

-- ========================================================================
-- INITIAL BOOTSTRAP DATA (MIT AOE Institutional Administrator)
-- ========================================================================

-- Seed Primary Administrator Account
-- Email: admin@mitaoe.ac.in
-- Password: Admin@123
INSERT INTO users (
    full_name,
    email,
    username,
    password_hash,
    role,
    is_active,
    is_email_verified,
    created_at,
    updated_at
) VALUES (
    'MIT AOE Administrator',
    'admin@mitaoe.ac.in',
    'admin',
    '$2b$12$eqL/osRQX6YHWio8IxJUY.S0utB2UnnGNHFY5M69osVa76pyrY6hC',
    'admin',
    TRUE,
    TRUE,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
) ON CONFLICT (email) DO NOTHING;

-- Seed Default Academic Year & Semester
INSERT INTO academic_years (name, start_date, end_date, is_current)
VALUES ('2025-2026', '2025-08-01', '2026-05-31', TRUE)
ON CONFLICT (name) DO NOTHING;

INSERT INTO semesters (academic_year_id, name, semester_number, is_active)
SELECT id, 'Semester 5 (Autumn 2025)', 5, TRUE
FROM academic_years
WHERE name = '2025-2026'
ON CONFLICT DO NOTHING;

-- Seed Attendance Threshold Settings
INSERT INTO system_settings (key, value, description)
VALUES 
    ('MIN_ATTENDANCE_WARNING_THRESHOLD', '75.0', 'Minimum required attendance percentage'),
    ('EXCELLENT_ATTENDANCE_THRESHOLD', '85.0', 'Distinction attendance threshold')
ON CONFLICT (key) DO NOTHING;

-- 18. LECTURE SWAPS / SUBSTITUTIONS
CREATE TABLE IF NOT EXISTS lecture_swaps (
    id SERIAL PRIMARY KEY,
    timetable_entry_id INTEGER NOT NULL REFERENCES timetable_entries(id) ON DELETE CASCADE,
    requesting_faculty_id INTEGER NOT NULL REFERENCES faculty_profiles(id) ON DELETE CASCADE,
    substitute_faculty_id INTEGER NOT NULL REFERENCES faculty_profiles(id) ON DELETE CASCADE,
    target_date DATE NOT NULL,
    target_timetable_entry_id INTEGER REFERENCES timetable_entries(id) ON DELETE SET NULL,
    target_swap_date DATE,
    reason VARCHAR(255),
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED'
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_lecture_swaps_entry ON lecture_swaps(timetable_entry_id);
CREATE INDEX IF NOT EXISTS idx_lecture_swaps_req_faculty ON lecture_swaps(requesting_faculty_id);
CREATE INDEX IF NOT EXISTS idx_lecture_swaps_sub_faculty ON lecture_swaps(substitute_faculty_id);
CREATE INDEX IF NOT EXISTS idx_lecture_swaps_date ON lecture_swaps(target_date);

