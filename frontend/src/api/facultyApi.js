import axiosClient from './axiosClient';

export const facultyApi = {
  getDashboard: () => axiosClient.get('/faculty/dashboard'),
  getTimetable: () => axiosClient.get('/faculty/timetable'),
  getLectureStudents: (lectureId, dateStr) => axiosClient.get(`/faculty/lectures/${lectureId}/students`, { params: { date: dateStr } }),
  submitAttendance: (lectureId, payload) => axiosClient.post(`/faculty/lectures/${lectureId}/attendance`, payload),
  getLectureAttendance: (lectureId, dateStr) => axiosClient.get(`/faculty/lectures/${lectureId}/attendance`, { params: { date: dateStr } }),
  requestCorrection: (payload) => axiosClient.post('/faculty/attendance-corrections', payload),
  getHistory: () => axiosClient.get('/faculty/history'),

  // Lecture Swaps & Substitutions
  getSwaps: () => axiosClient.get('/faculty/swaps'),
  requestSwap: (payload) => axiosClient.post('/faculty/swaps', payload),
  respondToSwap: (id, payload) => axiosClient.put(`/faculty/swaps/${id}/respond`, payload),
  cancelSwap: (id) => axiosClient.delete(`/faculty/swaps/${id}`),
  getColleagues: () => axiosClient.get('/faculty/colleagues'),

  // Timetable CSV Import
  importTimetableCsv: (formData) => axiosClient.post('/faculty/timetable/import-csv', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
};

