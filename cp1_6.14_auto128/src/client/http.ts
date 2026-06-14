import axios from 'axios';

const http = axios.create({
  baseURL: '/api',
  timeout: 8000,
});

http.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.error || error.message || '请求失败';
    return Promise.reject(new Error(message));
  }
);

export default http;
