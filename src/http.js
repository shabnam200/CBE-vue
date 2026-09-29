// Shared axios client. Sob API call ei client diye jay.
import axios from 'axios'
import { API_URL, TOKEN_KEY } from './config'

export const http = axios.create({
  baseURL: API_URL,
  headers: { Accept: 'application/json' },
  withCredentials: true, // session cookie login (Sanctum SPA) er jonno
})

http.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// 401 hole token muche login e pathao (mock mode e kichu kore na)
http.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err?.response?.status === 401 && localStorage.getItem(TOKEN_KEY)) {
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem('cbe_user')
      if (!location.pathname.startsWith('/login')) location.href = '/login'
    }
    return Promise.reject(err)
  },
)
