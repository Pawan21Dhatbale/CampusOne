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
  swapTimetableFaculty: (payload) => axiosClient.post('/admin/timetable/swap-faculty', payload),

  // Bulk CSV Imports
  importStudentsCsv: (formData) => axiosClient.post('/admin/students/import-csv', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  importFacultyCsv: (formData) => axiosClient.post('/admin/faculty/import-csv', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  importTimetableCsv: (formData) => axiosClient.post('/admin/timetable/import-csv', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),

  // Lecture Swaps & Substitutions
  getSwaps: (params) => axiosClient.get('/admin/swaps', { params }),
  createSwap: (payload) => axiosClient.post('/admin/swaps', payload),
  updateSwapStatus: (id, payload) => axiosClient.put(`/admin/swaps/${id}/status`, payload),
  deleteSwap: (id) => axiosClient.delete(`/admin/swaps/${id}`),

  // Attendance Records & Exports
  getAttendanceSessions: (params) => axiosClient.get('/admin/attendance/sessions', { params }),
  exportAttendanceCsvUrl: '/api/v1/admin/attendance/export-csv',

  // System
  getAuditLogs: () => axiosClient.get('/admin/audit-logs'),
  getSettings: () => axiosClient.get('/admin/settings'),
  updateSetting: (payload) => axiosClient.put('/admin/settings', payload),
};

