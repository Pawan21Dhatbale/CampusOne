import axiosClient from './axiosClient';

export const parentApi = {
  getDashboard: (childId) => axiosClient.get('/parent/dashboard', { params: { child_id: childId } }),
  getChildren: () => axiosClient.get('/parent/children'),
  getChildSummary: (childId) => axiosClient.get(`/parent/children/${childId}/attendance/summary`),
  getChildWeeklyReport: (childId, weeks = 4) => axiosClient.get(`/parent/children/${childId}/attendance/weekly`, { params: { weeks } }),
  getChildHistory: (childId) => axiosClient.get(`/parent/children/${childId}/attendance/history`),
  getChildTimetable: (childId) => axiosClient.get(`/parent/children/${childId}/timetable`),
};
