import axios from 'axios'

const http = axios.create({
  baseURL: 'http://localhost:3001',
  timeout: 5000,
})

export const get = <T>(url: string): Promise<T> => {
  return http.get(url).then((res) => res.data)
}

export const post = <T>(url: string, data: unknown): Promise<T> => {
  return http.post(url, data).then((res) => res.data)
}

export const put = <T>(url: string, data: unknown): Promise<T> => {
  return http.put(url, data).then((res) => res.data)
}

export default http
