import { apiClient } from './client'

export interface User {
  id: number
  correo: string
  nombre: string
  apellido: string
  rol: 'Admin' | 'Evaluador' | 'Consultor'
  fecha_registro: string
}

export interface LoginCredentials {
  correo: string
  password: string
}

export interface RegisterData {
  correo: string
  nombre: string
  apellido: string
  password: string
  password_confirm: string
}

export const authApi = {
  login: async (credentials: LoginCredentials) => {
    const { data } = await apiClient.post<{ access: string }>('/auth/login/', credentials)
    sessionStorage.setItem('access_token', data.access)
    return data
  },

  register: async (userData: RegisterData) => {
    const { data } = await apiClient.post<User>('/auth/register/', userData)
    return data
  },

  logout: async () => {
    await apiClient.post('/auth/logout/')
    sessionStorage.removeItem('access_token')
  },

  me: async () => {
    const { data } = await apiClient.get<User>('/auth/me/')
    return data
  },

  refresh: async () => {
    const { data } = await apiClient.post<{ access: string }>('/auth/refresh/')
    sessionStorage.setItem('access_token', data.access)
    return data
  },
}
