import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  register: (username: string, email: string, password: string) =>
    api.post('/auth/register', { username, email, password })
};

export const timelineAPI = {
  getTimelines: () => api.get('/timelines'),
  getTimeline: (id: string) => api.get(`/timelines/${id}`),
  createTimeline: (data: { title: string; themeColor: string }) =>
    api.post('/timelines', data),
  updateTimeline: (id: string, data: { title: string; themeColor: string }) =>
    api.put(`/timelines/${id}`, data),
  deleteTimeline: (id: string) => api.delete(`/timelines/${id}`),
  getEvents: (timelineId: string) => api.get(`/timelines/${timelineId}/events`),
  createEvent: (timelineId: string, data: any) =>
    api.post(`/timelines/${timelineId}/events`, data),
  updateEvent: (eventId: string, data: any) =>
    api.put(`/events/${eventId}`, data),
  deleteEvent: (eventId: string) => api.delete(`/events/${eventId}`),
  likeEvent: (eventId: string) => api.post(`/events/${eventId}/like`),
  addComment: (eventId: string, data: { nickname: string; content: string }) =>
    api.post(`/events/${eventId}/comments`, data),
  getComments: (eventId: string) => api.get(`/events/${eventId}/comments`),
  getSharedTimeline: (hash: string) => api.get(`/share/${hash}`),
  downloadPDF: (id: string) =>
    api.get(`/download/${id}`, { responseType: 'blob' })
};

export default api;
