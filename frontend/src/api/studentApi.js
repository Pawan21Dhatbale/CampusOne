import axiosClient from './axiosClient';

export const studentApi = {
  getDashboard: () => axiosClient.get('/student/dashboard'),
  getSummary: () => axiosClient.get('/student/attendance/summary'),
  getHistory: (params) => axiosClient.get('/student/attendance/history', { params }),
  getTimetable: () => axiosClient.get('/student/timetable'),
  getShortageCalculation: (params) => axiosClient.get('/student/shortage-calculator', { params }),
  requestCorrection: (payload) => axiosClient.post('/student/corrections', payload),
};
