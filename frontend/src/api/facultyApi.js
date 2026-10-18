import axiosClient from './axiosClient';

export const facultyApi = {
  getDashboard: () => axiosClient.get('/faculty/dashboard'),
  getTimetable: () => axiosClient.get('/faculty/timetable'),
  getLectureStudents: (lectureId, dateStr) => axiosClient.get(`/faculty/lectures/${lectureId}/students`, { params: { date: dateStr } }),
  submitAttendance: (lectureId, payload) => axiosClient.post(`/faculty/lectures/${lectureId}/attendance`, payload),
  getLectureAttendance: (lectureId, dateStr) => axiosClient.get(`/faculty/lectures/${lectureId}/attendance`, { params: { date: dateStr } }),
  requestCorrection: (payload) => axiosClient.post('/faculty/attendance-corrections', payload),
  getHistory: () => axiosClient.get('/faculty/history'),
};
