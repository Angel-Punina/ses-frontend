import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api/v1'

export const apiClient = axios.create({
  baseURL: API_BASE,
  withCredentials: true,   // envía y recibe cookies (refresh token HttpOnly)
  headers: { 'Content-Type': 'application/json' },
})

// Adjunta el access token en cada request
apiClient.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Si el token expiró (401), intenta renovarlo con la cookie de refresh
let isRefreshing = false
let failedQueue: Array<{ resolve: (t: string) => void; reject: (e: unknown) => void }> = []

const processQueue = (error: unknown, token: string | null) => {
  failedQueue.forEach((p) => (error ? p.reject(error) : p.resolve(token!)))
  failedQueue = []
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config
    if (
      error.response?.status === 401 &&
      !original._retry &&
      !original.url?.includes('/auth/refresh/') &&
      !original.url?.includes('/auth/login/')
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        }).then((token) => {
          original.headers.Authorization = `Bearer ${token}`
          return apiClient(original)
        })
      }

      original._retry = true
      isRefreshing = true

      try {
        const { data } = await apiClient.post('/auth/refresh/')
        sessionStorage.setItem('access_token', data.access)
        processQueue(null, data.access)
        original.headers.Authorization = `Bearer ${data.access}`
        return apiClient(original)
      } catch (refreshError) {
        processQueue(refreshError, null)
        sessionStorage.removeItem('access_token')
        window.location.href = '/login'
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }
    return Promise.reject(error)
  },
)
