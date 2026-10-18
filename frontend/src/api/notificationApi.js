import axiosClient from './axiosClient';

export const notificationApi = {
  getNotifications: (unreadOnly = false) => axiosClient.get('/notifications', { params: { unread: unreadOnly } }),
  markAsRead: (id) => axiosClient.put(`/notifications/${id}/read`),
  markAllAsRead: () => axiosClient.put('/notifications/read-all'),
};
