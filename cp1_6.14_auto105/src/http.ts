import axios from 'axios'

const http = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' }
})

http.interceptors.response.use(
  response => response,
  error => {
    if (error.response) {
      const status = error.response.status
      const message = error.response.data?.message || '请求失败'
      return Promise.reject({ status, message })
    }
    return Promise.reject({ status: 0, message: '网络连接失败' })
  }
)

export default http
