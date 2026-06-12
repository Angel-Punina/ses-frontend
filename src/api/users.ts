import { apiClient } from './client'

export interface AdminUser {
  id: number
  correo: string
  nombre: string
  apellido: string
  rol: 'Admin' | 'Evaluador' | 'Consultor'
  activo: boolean
  fecha_registro: string
  ultimo_acceso: string | null
}

export interface AuditLogEntry {
  id: number
  usuario: number | null
  usuario_nombre: string
  usuario_correo: string | null
  accion: string
  ip: string | null
  timestamp: string
  valor_anterior?: unknown
  valor_nuevo?: unknown
}

export interface CreateUserData {
  correo: string
  nombre: string
  apellido: string
  rol: string
  password: string
}

export const usersApi = {
  list: () =>
    apiClient.get<AdminUser[]>('/admin/users/').then((r) => r.data),

  create: (data: CreateUserData) =>
    apiClient.post<AdminUser>('/admin/users/', data).then((r) => r.data),

  update: (id: number, data: Partial<{ rol: string; activo: boolean }>) =>
    apiClient.patch<AdminUser>(`/admin/users/${id}/`, data).then((r) => r.data),

  delete: (id: number) =>
    apiClient.delete(`/admin/users/${id}/`),

  auditLog: (params?: { usuario?: number; desde?: string; hasta?: string }) =>
    apiClient.get<AuditLogEntry[]>('/admin/audit-log/', { params }).then((r) => r.data),

  auditLogCsv: () =>
    apiClient.get('/admin/audit-log/csv/', { responseType: 'blob' }).then((r) => r.data as Blob),
}
