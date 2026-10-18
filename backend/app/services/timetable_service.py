"""Timetable conflict detection and scheduling service."""
from datetime import time, datetime
from app.models.timetable import TimetableEntry


class TimetableService:
    @staticmethod
    def parse_time(time_val):
        """Helper to parse time string HH:MM into a time object."""
        if isinstance(time_val, time):
            return time_val
        if isinstance(time_val, str):
            parts = time_val.split(":")
            return time(int(parts[0]), int(parts[1]))
        return None

    @staticmethod
    def check_conflict(
        day_of_week: str,
        start_time_val,
        end_time_val,
        class_id: int,
        faculty_id: int,
        room_number: str = None,
        exclude_entry_id: int = None
    ):
        """
        Validates whether adding or modifying a timetable entry creates any schedule conflicts:
        1. Class conflict (Class already has a lecture during this time on this day)
        2. Faculty conflict (Faculty is already teaching another lecture during this time on this day)
        3. Room conflict (Room is already occupied during this time on this day)
        """
        start = TimetableService.parse_time(start_time_val)
        end = TimetableService.parse_time(end_time_val)

        if not start or not end:
            return False, "Invalid start or end time format."

        if start >= end:
            return False, "Lecture start time must be before end time."

        query = TimetableEntry.query.filter(
            TimetableEntry.day_of_week == day_of_week,
            TimetableEntry.is_active == True
        )
        if exclude_entry_id:
            query = query.filter(TimetableEntry.id != exclude_entry_id)

        entries = query.all()

        for entry in entries:
            # Check time overlap: (start < entry.end_time) and (end > entry.start_time)
            if start < entry.end_time and end > entry.start_time:
                # 1. Class conflict
                if entry.class_id == class_id:
                    return False, (
                        f"Class schedule conflict: Class {entry.class_ref.code if entry.class_ref else ''} "
                        f"already has '{entry.subject.name if entry.subject else 'a lecture'}' scheduled "
                        f"on {day_of_week} between {entry.start_time.strftime('%H:%M')} and {entry.end_time.strftime('%H:%M')}."
                    )

                # 2. Faculty conflict
                if entry.faculty_id == faculty_id:
                    fac_name = entry.faculty.user.full_name if entry.faculty and entry.faculty.user else "Faculty"
                    return False, (
                        f"Faculty schedule conflict: {fac_name} is already teaching "
                        f"'{entry.subject.name if entry.subject else 'another class'}' for "
                        f"{entry.class_ref.code if entry.class_ref else ''} on {day_of_week} "
                        f"between {entry.start_time.strftime('%H:%M')} and {entry.end_time.strftime('%H:%M')}."
                    )

                # 3. Room conflict (if room is assigned and non-empty)
                if room_number and entry.room_number and room_number.strip().lower() == entry.room_number.strip().lower():
                    return False, (
                        f"Room conflict: Room '{room_number}' is already reserved on {day_of_week} "
                        f"between {entry.start_time.strftime('%H:%M')} and {entry.end_time.strftime('%H:%M')} "
                        f"for {entry.class_ref.code if entry.class_ref else 'another class'}."
                    )

        return True, None

    @staticmethod
    def generate_timetable(
        class_id: int,
        academic_year_id: int = None,
        days: list = None,
        time_slots: list = None,
        default_room: str = "Room 101",
        save_as_draft: bool = True
    ):
        """
        Constraint-based automated timetable generator for a given class.
        Allocates weekly subject lectures based on faculty assignments, avoiding
        all faculty, class, and room conflicts.
        """
        from app.models.academic import FacultySubjectAssignment, Class, AcademicYear
        from app.extensions import db

        cls = Class.query.get(class_id)
        if not cls:
            return None, "Class not found."

        if not academic_year_id:
            ay = AcademicYear.query.filter_by(is_current=True).first()
            academic_year_id = ay.id if ay else None

        days = days or ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
        time_slots = time_slots or [
            ("09:00", "10:00"),
            ("10:00", "11:00"),
            ("11:15", "12:15"),
            ("13:00", "14:00"),
            ("14:00", "15:00"),
        ]

        # Get faculty-subject assignments for this class
        assignments = FacultySubjectAssignment.query.filter_by(
            class_id=class_id,
            is_active=True
        ).all()

        if not assignments:
            return None, f"No active faculty-subject assignments found for class {cls.code}."

        # Compute weekly periods per assignment based on subject credits
        periods_needed = []
        for a in assignments:
            credits = a.subject.credits if a.subject and a.subject.credits else 3
            count = max(2, min(credits, 4))
            for _ in range(count):
                periods_needed.append(a)

        generated_entries = []
        daily_subject_count = {}

        for day in days:
            for start_str, end_str in time_slots:
                if not periods_needed:
                    break

                assigned = False
                for i, assignment in enumerate(periods_needed):
                    sub_id = assignment.subject_id
                    fac_id = assignment.faculty_id
                    day_sub_key = (day, sub_id)

                    if daily_subject_count.get(day_sub_key, 0) >= 1:
                        continue

                    valid, _ = TimetableService.check_conflict(
                        day_of_week=day,
                        start_time_val=start_str,
                        end_time_val=end_str,
                        class_id=class_id,
                        faculty_id=fac_id,
                        room_number=default_room,
                    )
                    if valid:
                        entry = TimetableEntry(
                            class_id=class_id,
                            subject_id=sub_id,
                            faculty_id=fac_id,
                            day_of_week=day,
                            start_time=TimetableService.parse_time(start_str),
                            end_time=TimetableService.parse_time(end_str),
                            room_number=default_room,
                            academic_year_id=academic_year_id,
                            status="draft" if save_as_draft else "published",
                            is_active=True,
                        )
                        db.session.add(entry)
                        db.session.flush()
                        generated_entries.append(entry)
                        daily_subject_count[day_sub_key] = daily_subject_count.get(day_sub_key, 0) + 1
                        periods_needed.pop(i)
                        assigned = True
                        break

        db.session.commit()
        return generated_entries, None
