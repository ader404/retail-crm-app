import axios from 'axios'
import { getApiUrl } from './runtime-config'

const api = axios.create({
  baseURL: getApiUrl(),
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('access_token')
    if (token) config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (res) => res,
  (error) => Promise.reject(error),
)

export default api
