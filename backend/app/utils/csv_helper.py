"""CSV parsing and normalization helpers for SmartAttend bulk imports."""
import csv
import io


def parse_csv_input(request):
    """
    Extracts and parses CSV content from either multipart/form-data ('file' field)
    or JSON request body ('csv_content' field).
    
    Returns:
        (rows: list of dicts, error_message: str | None)
    """
    content = None

    if "file" in request.files:
        uploaded_file = request.files["file"]
        if not uploaded_file or uploaded_file.filename == "":
            return None, "No CSV file selected for upload."
        
        raw_bytes = uploaded_file.read()
        # Handle UTF-8 BOM, standard UTF-8, and fallback to latin-1
        try:
            content = raw_bytes.decode("utf-8-sig")
        except UnicodeDecodeError:
            try:
                content = raw_bytes.decode("utf-8")
            except UnicodeDecodeError:
                content = raw_bytes.decode("latin-1")
    else:
        json_data = request.get_json(silent=True) or {}
        content = json_data.get("csv_content")

    if not content or not content.strip():
        return None, "CSV content is empty. Please upload a valid CSV file with data rows."

    # Normalize newlines
    content = content.replace("\r\n", "\n").replace("\r", "\n")

    # Detect delimiter with fallback
    sample = content[:4096]
    delimiter = ","
    try:
        sniffer = csv.Sniffer()
        dialect = sniffer.sniff(sample, delimiters=",\t;|")
        delimiter = dialect.delimiter
    except Exception:
        delimiter = ","

    f = io.StringIO(content)
    reader = csv.reader(f, delimiter=delimiter)

    try:
        header_raw = next(reader, None)
    except Exception as e:
        return None, f"Failed to parse CSV header: {str(e)}"

    if not header_raw:
        return None, "CSV file is empty or missing headers."

    # Normalize header keys: strip, lower, replace spaces and dashes with underscores
    headers = []
    for h in header_raw:
        cleaned = str(h).strip().lower().replace(" ", "_").replace("-", "_").replace(".", "_")
        headers.append(cleaned)

    rows = []
    for line_num, row_values in enumerate(reader, start=2):
        # Skip completely blank lines
        if not row_values or all(str(val).strip() == "" for val in row_values):
            continue

        row_dict = {}
        for idx, key in enumerate(headers):
            if idx < len(row_values):
                row_dict[key] = str(row_values[idx]).strip()
            else:
                row_dict[key] = ""
        row_dict["_line_number"] = line_num
        rows.append(row_dict)

    if not rows:
        return None, "CSV file contains headers but no data rows."

    return rows, None


def get_field_val(row: dict, *aliases, default=""):
    """
    Returns the first matching value from row for the provided alias keys.
    """
    for alias in aliases:
        clean_alias = alias.lower().replace(" ", "_").replace("-", "_")
        if clean_alias in row and row[clean_alias]:
            return row[clean_alias].strip()
    return default
