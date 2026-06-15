import axios from 'axios';

const http = axios.create({
  baseURL: '/api',
  timeout: 5000,
  headers: {
    'Content-Type': 'application/json'
  }
});

http.interceptors.response.use(
  response => response.data,
  error => {
    console.error('HTTP Error:', error);
    return Promise.reject(error);
  }
);

export default http;
