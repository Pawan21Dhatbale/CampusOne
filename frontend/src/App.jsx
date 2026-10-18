import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ProtectedRoute } from './layouts/ProtectedRoute';
import { DashboardLayout } from './layouts/DashboardLayout';
import { RootRedirect } from './layouts/RootRedirect';

// Auth pages
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { VerifyEmailPage } from './pages/auth/VerifyEmailPage';

// Admin pages
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { StudentsManagementPage } from './pages/admin/StudentsManagementPage';
import { FacultyManagementPage } from './pages/admin/FacultyManagementPage';
import { TimetableManagementPage } from './pages/admin/TimetableManagementPage';
import { AttendanceReportsPage } from './pages/admin/AttendanceReportsPage';

// Faculty pages
import { FacultyDashboardPage } from './pages/faculty/FacultyDashboardPage';
import { FacultyTimetablePage } from './pages/faculty/FacultyTimetablePage';
import { TakeAttendancePage } from './pages/faculty/TakeAttendancePage';
import { FacultyHistoryPage } from './pages/faculty/FacultyHistoryPage';

// Student pages
import { StudentDashboardPage } from './pages/student/StudentDashboardPage';
import { SubjectAttendancePage } from './pages/student/SubjectAttendancePage';
import { ShortageCalculatorPage } from './pages/student/ShortageCalculatorPage';
import { StudentHistoryPage } from './pages/student/StudentHistoryPage';
import { StudentTimetablePage } from './pages/student/StudentTimetablePage';

// Parent pages
import { ParentDashboardPage } from './pages/parent/ParentDashboardPage';
import { ParentWeeklyReportPage } from './pages/parent/ParentWeeklyReportPage';
import { ParentChildHistoryPage } from './pages/parent/ParentChildHistoryPage';
import { ParentChildTimetablePage } from './pages/parent/ParentChildTimetablePage';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Root: redirect based on auth state — no LandingPage in active entry flow */}
            <Route path="/" element={<RootRedirect />} />

            {/* Public auth routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/verify-email" element={<VerifyEmailPage />} />

            {/* Admin Portal Routes */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<AdminDashboardPage />} />
              <Route path="students" element={<StudentsManagementPage />} />
              <Route path="faculty" element={<FacultyManagementPage />} />
              <Route path="timetable" element={<TimetableManagementPage />} />
              <Route path="attendance" element={<AttendanceReportsPage />} />
            </Route>

            {/* Faculty Portal Routes */}
            <Route
              path="/faculty"
              element={
                <ProtectedRoute allowedRoles={['faculty']}>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<FacultyDashboardPage />} />
              <Route path="timetable" element={<FacultyTimetablePage />} />
              <Route path="attendance/:lectureId" element={<TakeAttendancePage />} />
              <Route path="history" element={<FacultyHistoryPage />} />
            </Route>

            {/* Student Portal Routes */}
            <Route
              path="/student"
              element={
                <ProtectedRoute allowedRoles={['student']}>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<StudentDashboardPage />} />
              <Route path="subjects" element={<SubjectAttendancePage />} />
              <Route path="calculator" element={<ShortageCalculatorPage />} />
              <Route path="history" element={<StudentHistoryPage />} />
              <Route path="timetable" element={<StudentTimetablePage />} />
            </Route>

            {/* Parent Portal Routes */}
            <Route
              path="/parent"
              element={
                <ProtectedRoute allowedRoles={['parent']}>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<ParentDashboardPage />} />
              <Route path="weekly" element={<ParentWeeklyReportPage />} />
              <Route path="history" element={<ParentChildHistoryPage />} />
              <Route path="timetable" element={<ParentChildTimetablePage />} />
            </Route>

            {/* Fallback: redirect all unknown routes to root (which resolves auth-first) */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;


