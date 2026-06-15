import axios from 'axios';

const http = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

http.interceptors.request.use(
  (config) => {
    const userId = localStorage.getItem('lingoloop_userId');
    if (userId) {
      config.headers['X-User-Id'] = userId;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

http.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    console.error('Request error:', error);
    return Promise.reject(error);
  }
);

export const userAPI = {
  register: (data: { nickname: string; nativeLanguage: string; targetLanguage: string }) =>
    http.post('/users/register', data),
  getLanguages: () => http.get('/users/languages'),
  getPartners: (userId: string) => http.get(`/users/partners?userId=${userId}`),
  getUser: (userId: string) => http.get(`/users/${userId}`),
  getUnread: (userId: string) => http.get(`/users/unread/${userId}`),
  markRead: (userId: string, sessionId: string) =>
    http.post('/users/mark-read', { userId, sessionId }),
};

export const sessionAPI = {
  create: (userId: string, partnerId: string) =>
    http.post('/sessions/create', { userId, partnerId }),
  getSession: (sessionId: string) => http.get(`/sessions/${sessionId}`),
  sendMessage: (data: { sessionId: string; senderId: string; content: string; type?: string }) =>
    http.post('/sessions/message', data),
  getMessages: (sessionId: string, before?: number) =>
    http.get(`/sessions/${sessionId}/messages${before ? `?before=${before}` : ''}`),
  addCorrection: (data: {
    sessionId: string;
    messageId: string;
    correctorId: string;
    originalText: string;
    correctedText: string;
  }) => http.post('/sessions/correction', data),
  getCorrections: (sessionId: string) => http.get(`/sessions/${sessionId}/corrections`),
  addNote: (data: { sessionId: string; userId: string; messageId?: string; content: string }) =>
    http.post('/sessions/note', data),
  getNotes: (sessionId: string, userId?: string) =>
    http.get(`/sessions/${sessionId}/notes${userId ? `?userId=${userId}` : ''}`),
  endSession: (sessionId: string) => http.post('/sessions/end', { sessionId }),
  getHistory: (userId: string) => http.get(`/sessions/user/${userId}/history`),
};

export default http;
