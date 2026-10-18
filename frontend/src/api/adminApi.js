import axiosClient from './axiosClient';

export const adminApi = {
  getDashboardStats: () => axiosClient.get('/admin/dashboard'),
  
  // Students
  getStudents: (params) => axiosClient.get('/admin/students', { params }),
  createStudent: (payload) => axiosClient.post('/admin/students', payload),
  updateStudent: (id, payload) => axiosClient.put(`/admin/students/${id}`, payload),
  deleteStudent: (id) => axiosClient.delete(`/admin/students/${id}`),

  // Faculty
  getFaculty: (params) => axiosClient.get('/admin/faculty', { params }),
  createFaculty: (payload) => axiosClient.post('/admin/faculty', payload),
  updateFaculty: (id, payload) => axiosClient.put(`/admin/faculty/${id}`, payload),

  // Classes & Subjects
  getClasses: () => axiosClient.get('/admin/classes'),
  createClass: (payload) => axiosClient.post('/admin/classes', payload),
  getSubjects: () => axiosClient.get('/admin/subjects'),
  createSubject: (payload) => axiosClient.post('/admin/subjects', payload),
  getAssignments: () => axiosClient.get('/admin/assignments'),
  createAssignment: (payload) => axiosClient.post('/admin/assignments', payload),

  // Timetable
  getTimetable: (params) => axiosClient.get('/admin/timetable', { params }),
  createTimetableEntry: (payload) => axiosClient.post('/admin/timetable', payload),
  deactivateTimetableEntry: (id) => axiosClient.delete(`/admin/timetable/${id}`),

  // Attendance Records & Exports
  getAttendanceSessions: (params) => axiosClient.get('/admin/attendance/sessions', { params }),
  exportAttendanceCsvUrl: '/api/v1/admin/attendance/export-csv',

  // System
  getAuditLogs: () => axiosClient.get('/admin/audit-logs'),
  getSettings: () => axiosClient.get('/admin/settings'),
  updateSetting: (payload) => axiosClient.put('/admin/settings', payload),
};
