# 🛠️ SmartAttend — Tech Stack

A quick overview of every technology used in this project, split by layer.

---

## 🖥️ Frontend

| Technology | Version | Role |
|---|---|---|
| **React** | 18.2 | UI library |
| **Vite** | 5.2 | Build tool & dev server |
| **React Router DOM** | 6.23 | Client-side routing |
| **Tailwind CSS** | 3.4 | Utility-first CSS framework |
| **Axios** | 1.6 | HTTP client for API calls |
| **Recharts** | 2.12 | Chart & data visualisation |
| **Lucide React** | 0.372 | Icon library |
| **PostCSS + Autoprefixer** | — | CSS post-processing |

### Brief Explanations

- **React** — A JavaScript library for building component-based, reactive user interfaces. The entire UI is built as a tree of reusable React components.
- **Vite** — An extremely fast dev server and bundler. It serves files using native ES modules during development, making hot-reloads nearly instant.
- **React Router DOM** — Handles navigation between pages (dashboard, login, student view, etc.) entirely on the client side without full page reloads.
- **Tailwind CSS** — A utility-first CSS framework where you style elements by composing small, predefined class names directly in JSX instead of writing custom CSS files.
- **Axios** — Promise-based HTTP client used to communicate with the Flask REST API (login, fetch attendance records, etc.).
- **Recharts** — A composable charting library built on top of React and SVG, used to render attendance graphs and statistics.
- **Lucide React** — A clean, consistent icon set available as React components (e.g., calendar, user, bell icons throughout the UI).
- **PostCSS / Autoprefixer** — Processes and auto-prefixes CSS for cross-browser compatibility; required by Tailwind to work correctly.

---

## ⚙️ Backend

| Technology | Version | Role |
|---|---|---|
| **Python** | 3.x | Runtime language |
| **Flask** | 3.0.3 | Web framework |
| **Flask-SQLAlchemy** | 3.1.1 | ORM (database models) |
| **Flask-Migrate** | 4.0.7 | Database migrations (Alembic) |
| **Flask-JWT-Extended** | 4.6.0 | JWT authentication |
| **Flask-Bcrypt** | 1.0.1 | Password hashing |
| **Flask-CORS** | 4.0.1 | Cross-origin request handling |
| **Marshmallow** | 3.21.1 | Request/response serialization |
| **python-dotenv** | 1.0.1 | `.env` file loading |
| **Werkzeug** | 3.0.2 | WSGI utilities (used by Flask) |
| **Pytest + pytest-flask** | 8.1.1 | Testing framework |

### Brief Explanations

- **Flask** — A lightweight Python web framework. The backend is structured using Flask's **Application Factory** pattern with **Blueprints** to keep routes for admin, faculty, student, and parent roles separated.
- **Flask-SQLAlchemy** — Integrates SQLAlchemy ORM with Flask, letting you define database tables as Python classes (models) and query them using Python instead of raw SQL.
- **Flask-Migrate** — Wraps Alembic to handle incremental database schema changes (e.g., adding a new column) through migration scripts, so the database evolves safely alongside the code.
- **Flask-JWT-Extended** — Adds JSON Web Token (JWT) support — users log in and receive a token; that token is sent with every subsequent request to prove identity without storing session data on the server.
- **Flask-Bcrypt** — Hashes passwords before storing them in the database so plain-text passwords are never saved. Also used to verify passwords on login.
- **Flask-CORS** — Allows the React frontend (running on port 5173) to make API calls to the Flask server (port 5000) without the browser blocking the requests due to the Same-Origin Policy.
- **Marshmallow** — A serialization/deserialization library. It validates incoming request data and converts Python objects to JSON for API responses cleanly.
- **python-dotenv** — Reads key-value pairs from the `.env` file and injects them as environment variables, keeping secrets (DB passwords, JWT keys) out of source code.
- **Werkzeug** — A low-level WSGI library that Flask is built on top of. It handles routing, request/response objects, and dev-server functionality.
- **Pytest / pytest-flask** — Testing framework used to write and run unit and integration tests for the API endpoints and business logic.

---

## 🗄️ Database

| Technology | Role |
|---|---|
| **PostgreSQL** | Primary production database |
| **SQLite** | Automatic fallback for local development (no Postgres needed) |
| **psycopg2-binary** | Python driver/adapter to connect Flask to PostgreSQL |

### Brief Explanations

- **PostgreSQL** — A powerful, open-source relational database. The production and default development target. Stores all users, attendance records, subjects, and notifications.
- **SQLite** — A file-based, zero-configuration database. The backend automatically falls back to it when PostgreSQL is not reachable, making local setup frictionless.
- **psycopg2-binary** — The Python library that actually opens and manages connections between the Flask app and a PostgreSQL server.

---

## 🔧 DevOps / Tooling

| Tool | Role |
|---|---|
| **python-dotenv / `.env`** | Environment variable management |
| **Vite Proxy** | Dev proxy — forwards `/api` requests from React to Flask |
| **npm** | Frontend package manager |
| **pip + venv** | Backend package manager & virtual environment |
| **Git / `.gitignore`** | Version control |

### Brief Explanations

- **Vite Proxy** — During development, any request from React to `/api/...` is automatically forwarded to `http://127.0.0.1:5000`, so you don't need to hard-code the backend URL or deal with CORS in development.
- **venv** — Python's built-in virtual environment tool. Isolates project dependencies from your global Python installation.

---

## 🏗️ Architecture Summary

```
┌─────────────────────────────┐
│        Browser (User)       │
└────────────┬────────────────┘
             │  HTTP (port 5173)
             ▼
┌─────────────────────────────┐
│   React 18 + Vite (Frontend)│
│  Tailwind · Recharts · Axios│
│  React Router · Lucide      │
└────────────┬────────────────┘
             │  REST API  /api/v1/*  (port 5000)
             ▼
┌─────────────────────────────┐
│    Flask 3 (Backend API)    │
│  JWT Auth · SQLAlchemy ORM  │
│  Marshmallow · Blueprints   │
└────────────┬────────────────┘
             │  SQL
             ▼
┌─────────────────────────────┐
│  PostgreSQL  (or SQLite ↩)  │
└─────────────────────────────┘
```

---

> **Project Name:** SmartAttend  
> **Type:** Attendance Management System (Minor Project)  
> **Pattern:** REST API + Single Page Application (SPA)
