import axios, { AxiosInstance, AxiosError } from 'axios'

export interface ApiError {
  error: string
  conflict?: boolean
}

const http: AxiosInstance = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
})

http.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiError>) => {
    const message = error.response?.data?.error || error.message || '网络请求失败'
    console.error('[HTTP Error]', message)
    return Promise.reject({ message, raw: error, data: error.response?.data })
  }
)

export default http
