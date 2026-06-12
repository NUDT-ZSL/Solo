import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 5000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('library_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('library_user');
      localStorage.removeItem('library_token');
    }
    return Promise.reject(error);
  }
);

export default api;
