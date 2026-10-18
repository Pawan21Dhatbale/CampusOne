"""Email and PRN validators for MIT AOE institutional accounts."""
import re


def validate_prn_email(email: str, is_testing: bool = False) -> tuple[bool, str | None]:
    """
    Validates whether an email matches the 12-digit PRN institutional format:
    e.g. 202501100063@mitaoe.ac.in -> PRN: 202501100063

    Returns:
        (is_valid: bool, extracted_prn: str | None)
    """
    if not email or not isinstance(email, str):
        return False, None

    email = email.strip().lower()

    # Primary format: exactly 12 digits followed by @mitaoe.ac.in
    match = re.match(r"^(\d{12})@mitaoe\.ac\.in$", email)
    if match:
        return True, match.group(1)

    if is_testing:
        # In test mode, support 12-digit PRN test domains and test fixtures
        match_test_num = re.match(r"^(\d{12})@test\.edu$", email)
        if match_test_num:
            return True, match_test_num.group(1)
        match_test_fix = re.match(r"^([a-zA-Z0-9_.-]+)@test\.edu$", email)
        if match_test_fix:
            return True, match_test_fix.group(1)

    return False, None


def validate_mitaoe_email(email: str, is_testing: bool = False) -> bool:
    """
    Validates whether an email belongs to the institutional domain @mitaoe.ac.in
    (used for faculty/admin institutional access).
    """
    if not email or not isinstance(email, str):
        return False
    email = email.strip().lower()
    if email.endswith("@mitaoe.ac.in") and "@" in email and len(email.split("@")[0]) > 0:
        return True
    if is_testing and email.endswith("@test.edu"):
        return True
    return False
