# SmartAttend — Beginner's Setup Guide for Windows & VS Code

This step-by-step guide is designed for students learning full-stack web development. Follow these exact instructions to set up, initialize, test, and run SmartAttend on your computer using Visual Studio Code and Windows PowerShell.

---

## 1. Prerequisites

Make sure the following tools are installed on your computer:
1. **Python 3.10+**: Download from [python.org](https://www.python.org/downloads/) (Check *"Add python.exe to PATH"* during installation).
2. **Node.js (v18+) & npm**: Download from [nodejs.org](https://nodejs.org/).
3. **Visual Studio Code**: Download from [code.visualstudio.com](https://code.visualstudio.com/).
4. **PostgreSQL** *(Recommended)* or use the automatic SQLite development fallback:
   - If using PostgreSQL, create a database named `smartattend_db`.
   - If you don't have PostgreSQL installed yet, SmartAttend's development configuration will automatically fall back to a local SQLite database (`smartattend.db`), allowing you to start coding and testing immediately!

---

## 2. Opening the Project in VS Code

1. Open **Visual Studio Code**.
2. Click **File &rarr; Open Folder...** and select `d:\project`.
3. Open an integrated PowerShell terminal in VS Code:
   - Shortcut: press <kbd>Ctrl</kbd> + <kbd>`</kbd> (Backtick) or select **Terminal &rarr; New Terminal** from the top menu.

---

## 3. Backend Setup & Database Initialization

### Step 3.1: Navigate to the Backend Folder
```powershell
cd d:\project\backend
```

### Step 3.2: Create and Activate a Python Virtual Environment
```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
```
*(If you see an execution policy warning in PowerShell, run `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass` and then run `.\venv\Scripts\Activate.ps1` again).*

### Step 3.3: Install Python Dependencies
```powershell
pip install -r requirements.txt
```

### Step 3.4: Configure Environment Variables
A pre-configured `.env` file is ready in `backend/.env`. If you want to use PostgreSQL, verify the `DATABASE_URL` line matches your PostgreSQL password:
```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/smartattend_db
USE_SQLITE_FALLBACK=True
```

### Step 3.5: Seed Development Data
Run the idempotent seed script to create all database tables and realistic test accounts:
```powershell
python run.py seed
```
You will see output confirming the creation of Admin, Faculty, 20+ Students, 5 Parents, Timetables, and attendance records.

### Step 3.6: Run the Pytest Automated Test Suite
To verify that all RBAC, absent-first attendance, timetable conflict detection, and parent isolation rules pass:
```powershell
pytest -v
```

### Step 3.7: Start the Flask Backend Server
```powershell
python run.py
```
The backend API is now running on `http://127.0.0.1:5000`! Leave this terminal running.

---

## 4. Frontend Setup & Launch

Open a **second terminal tab** in VS Code (click the `+` icon in the terminal panel):

### Step 4.1: Navigate to Frontend Folder
```powershell
cd d:\project\frontend
```

### Step 4.2: Install Node.js Dependencies
```powershell
npm install
```

### Step 4.3: Start the Vite React Development Server
```powershell
npm run dev
```

The frontend will start instantly at:
```
http://localhost:5173
```
Hold <kbd>Ctrl</kbd> and click the link in the terminal, or open your web browser and navigate to `http://localhost:5173`.

---

## 5. Development Test Credentials

| Portal / Role | Email Address | Password | Demonstration Details |
|---|---|---|---|
| **Admin** | `admin@college.edu` | `Admin@123` | Full administrative control, student CRUD, faculty CRUD, timetable conflict checker, audit logs, CSV export |
| **Faculty 1** | `faculty1@college.edu` | `Faculty@123` | Prof. Alan Turing. Assigned to CS301 (Data Structures). Conducts absent-first attendance. |
| **Faculty 2** | `faculty2@college.edu` | `Faculty@123` | Prof. Grace Hopper. Assigned to CS302 (Database Systems). |
| **Faculty 3** | `faculty3@college.edu` | `Faculty@123` | Prof. Donald Knuth. Assigned to CS304 (Computer Networks). |
| **Student 1** | `student1@college.edu` | `Student@123` | Aarav Sharma (Roll: CS-101). Excellent attendance. |
| **Student 3** | `student3@college.edu` | `Student@123` | Alexander Wright (Roll: CS-103). Shortage warning demo & interactive calculator. |
| **Parent 1** | `parent1@example.com` | `Parent@123` | Vikram Sharma. Linked to **Student 1** AND **Student 2** (Multi-child switcher demo). |
| **Parent 2** | `parent2@example.com` | `Parent@123` | Priya Patel. Linked to Student 3 only. Strict isolation from other students. |
