import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { usersApi, type CreateUserData } from '@/api/users'

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

const ROL_OPTIONS = ['Admin', 'Evaluador', 'Consultor']

const ROL_BADGE: Record<string, { bg: string; color: string }> = {
  Admin: { bg: '#f9ebea', color: 'var(--red)' },
  Evaluador: { bg: '#ebf5fb', color: 'var(--blue)' },
  Consultor: { bg: '#eafaf1', color: 'var(--green)' },
}

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
}

function fmtAction(accion: string) {
  const [method, ...pathParts] = accion.split(' ')
  const path = pathParts.join(' ')
  const colors: Record<string, string> = {
    POST: 'var(--green)', PATCH: 'var(--orange)', PUT: 'var(--orange)', DELETE: 'var(--red)'
  }
  return { method, path, color: colors[method] ?? 'var(--gray2)' }
}

export function AdminView() {
  const [tab, setTab] = useState<'usuarios' | 'auditlog'>('usuarios')
  const [showCreate, setShowCreate] = useState(false)

  // Audit log filters
  const [filterUser, setFilterUser] = useState('')
  const [filterDesde, setFilterDesde] = useState('')
  const [filterHasta, setFilterHasta] = useState('')

  const qc = useQueryClient()

  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: usersApi.list,
    enabled: tab === 'usuarios',
  })

  const auditParams = {
    ...(filterUser ? { usuario: Number(filterUser) } : {}),
    ...(filterDesde ? { desde: filterDesde } : {}),
    ...(filterHasta ? { hasta: filterHasta } : {}),
  }

  const { data: logs = [], isLoading: logsLoading } = useQuery({
    queryKey: ['audit-log', auditParams],
    queryFn: () => usersApi.auditLog(auditParams),
    enabled: tab === 'auditlog',
  })

  const createMutation = useMutation({
    mutationFn: usersApi.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-users'] }); setShowCreate(false) },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<{ rol: string; activo: boolean }> }) =>
      usersApi.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
  })

  const deleteMutation = useMutation({
    mutationFn: usersApi.delete,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
  })

  const TAB_STYLE = (active: boolean): React.CSSProperties => ({
    padding: '8px 18px', fontSize: 13.5, fontWeight: active ? 600 : 450,
    color: active ? 'var(--dark)' : 'var(--gray2)',
    background: 'none', border: 'none', borderBottom: active ? '2px solid var(--light)' : '2px solid transparent',
    cursor: 'pointer', transition: 'all 0.15s',
  })

  return (
    <div>
      <div style={{ marginBottom: 22 }}>
        <h2 style={{ fontFamily: '"Fraunces", serif', fontSize: 22, fontWeight: 600, color: 'var(--dark)', marginBottom: 3 }}>
          Administración
        </h2>
        <p style={{ color: 'var(--gray2)', fontSize: 13 }}>Gestión de usuarios y auditoría del sistema</p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid #eaecee', marginBottom: 22, gap: 4 }}>
        <button style={TAB_STYLE(tab === 'usuarios')} onClick={() => setTab('usuarios')}>Usuarios</button>
        <button style={TAB_STYLE(tab === 'auditlog')} onClick={() => setTab('auditlog')}>Log de Auditoría</button>
      </div>

      {/* ── Usuarios ── */}
      {tab === 'usuarios' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
            <button
              onClick={() => setShowCreate(true)}
              style={{ background: 'var(--dark)', color: 'var(--white)', border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--mid)' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--dark)' }}
            >+ Nuevo usuario</button>
          </div>

          <div style={{ background: 'var(--white)', border: '1px solid rgba(0,0,0,0.07)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)', overflow: 'hidden' }}>
            {usersLoading ? (
              <div style={{ padding: 32, textAlign: 'center', color: 'var(--gray2)', fontSize: 13 }}>Cargando...</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#fafbfc', borderBottom: '1px solid #eaecee' }}>
                    {['Usuario', 'Correo', 'Rol', 'Estado', 'Registro', 'Último acceso', ''].map((h) => (
                      <th key={h} style={{ padding: '10px 16px', fontSize: 11.5, fontWeight: 600, color: 'var(--gray2)', textAlign: 'left', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => {
                    const badge = ROL_BADGE[u.rol] ?? ROL_BADGE.Evaluador
                    return (
                      <tr key={u.id} style={{ borderBottom: '1px solid #f5f6f7' }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = '#fafbfc' }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = 'transparent' }}
                      >
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 30, height: 30, borderRadius: '50%', background: badge.bg, color: badge.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                              {u.nombre[0]?.toUpperCase()}{u.apellido[0]?.toUpperCase()}
                            </div>
                            <span style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--dark)' }}>{u.nombre} {u.apellido}</span>
                          </div>
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: 12.5, color: 'var(--gray2)' }}>{u.correo}</td>
                        <td style={{ padding: '12px 16px' }}>
                          <select
                            value={u.rol}
                            onChange={(e) => updateMutation.mutate({ id: u.id, data: { rol: e.target.value } })}
                            style={{ fontSize: 11.5, fontWeight: 600, padding: '3px 8px', borderRadius: 20, background: badge.bg, color: badge.color, border: 'none', cursor: 'pointer' }}
                          >
                            {ROL_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                          </select>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <button
                            onClick={() => updateMutation.mutate({ id: u.id, data: { activo: !u.activo } })}
                            style={{
                              fontSize: 11.5, fontWeight: 600, padding: '3px 10px', borderRadius: 20, border: 'none', cursor: 'pointer',
                              background: u.activo ? '#eafaf1' : '#f9ebea',
                              color: u.activo ? 'var(--green)' : 'var(--red)',
                            }}
                          >{u.activo ? 'Activo' : 'Inactivo'}</button>
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--gray2)' }}>{fmtDate(u.fecha_registro)}</td>
                        <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--gray2)' }}>{fmtDate(u.ultimo_acceso)}</td>
                        <td style={{ padding: '12px 16px' }}>
                          <button
                            onClick={() => { if (confirm(`¿Eliminar a ${u.nombre} ${u.apellido}?`)) deleteMutation.mutate(u.id) }}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#e74c3c', fontSize: 13, padding: '4px 8px', borderRadius: 6 }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = '#f9ebea' }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = 'none' }}
                            title="Eliminar usuario"
                          >✕</button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ── Audit Log ── */}
      {tab === 'auditlog' && (
        <div>
          {/* Filters */}
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', marginBottom: 16, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 12, color: 'var(--gray2)', fontWeight: 500 }}>Desde</label>
              <input type="date" value={filterDesde} onChange={(e) => setFilterDesde(e.target.value)}
                style={{ border: '1.5px solid #d5d8dc', borderRadius: 8, padding: '7px 10px', fontSize: 13, color: 'var(--gray1)' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 12, color: 'var(--gray2)', fontWeight: 500 }}>Hasta</label>
              <input type="date" value={filterHasta} onChange={(e) => setFilterHasta(e.target.value)}
                style={{ border: '1.5px solid #d5d8dc', borderRadius: 8, padding: '7px 10px', fontSize: 13, color: 'var(--gray1)' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 12, color: 'var(--gray2)', fontWeight: 500 }}>Usuario</label>
              <select value={filterUser} onChange={(e) => setFilterUser(e.target.value)}
                style={{ border: '1.5px solid #d5d8dc', borderRadius: 8, padding: '7px 10px', fontSize: 13, color: 'var(--gray1)', minWidth: 180 }}>
                <option value="">Todos</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.nombre} {u.apellido}</option>
                ))}
              </select>
            </div>
            {(filterDesde || filterHasta || filterUser) && (
              <button
                onClick={() => { setFilterDesde(''); setFilterHasta(''); setFilterUser('') }}
                style={{ background: 'none', border: '1.5px solid #d5d8dc', borderRadius: 8, padding: '7px 14px', fontSize: 13, color: 'var(--gray2)', cursor: 'pointer' }}
              >Limpiar</button>
            )}
            <button
              onClick={() => usersApi.auditLogCsv().then((blob) => downloadBlob(blob, 'audit_log.csv'))}
              style={{ marginLeft: 'auto', background: 'var(--dark)', color: 'var(--white)', border: 'none', cursor: 'pointer', borderRadius: 8, padding: '9px 18px', fontSize: 13, fontWeight: 500 }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--mid)' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--dark)' }}
            >↓ Exportar CSV</button>
          </div>

          <div style={{ background: 'var(--white)', border: '1px solid rgba(0,0,0,0.07)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)', overflow: 'hidden' }}>
            {logsLoading ? (
              <div style={{ padding: 32, textAlign: 'center', color: 'var(--gray2)', fontSize: 13 }}>Cargando...</div>
            ) : logs.length === 0 ? (
              <div style={{ padding: 32, textAlign: 'center', color: 'var(--gray2)', fontSize: 13 }}>Sin registros para los filtros seleccionados</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#fafbfc', borderBottom: '1px solid #eaecee' }}>
                    {['#', 'Usuario', 'Acción', 'IP', 'Fecha'].map((h) => (
                      <th key={h} style={{ padding: '10px 16px', fontSize: 11.5, fontWeight: 600, color: 'var(--gray2)', textAlign: 'left', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => {
                    const { method, path, color } = fmtAction(log.accion)
                    return (
                      <tr key={log.id} style={{ borderBottom: '1px solid #f5f6f7' }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = '#fafbfc' }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = 'transparent' }}
                      >
                        <td style={{ padding: '10px 16px', fontSize: 11.5, color: 'var(--gray3)', fontFamily: '"DM Mono", monospace' }}>{log.id}</td>
                        <td style={{ padding: '10px 16px' }}>
                          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--dark)' }}>{log.usuario_nombre}</span>
                          {log.usuario_correo && (
                            <span style={{ display: 'block', fontSize: 11.5, color: 'var(--gray2)' }}>{log.usuario_correo}</span>
                          )}
                        </td>
                        <td style={{ padding: '10px 16px' }}>
                          <span style={{ fontSize: 10.5, fontFamily: '"DM Mono", monospace', fontWeight: 700, color, marginRight: 8 }}>{method}</span>
                          <span style={{ fontSize: 12, color: 'var(--gray2)', fontFamily: '"DM Mono", monospace' }}>{path}</span>
                        </td>
                        <td style={{ padding: '10px 16px', fontSize: 12, color: 'var(--gray2)', fontFamily: '"DM Mono", monospace' }}>{log.ip ?? '—'}</td>
                        <td style={{ padding: '10px 16px', fontSize: 12, color: 'var(--gray2)', whiteSpace: 'nowrap' }}>
                          {new Date(log.timestamp).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ── Create User Modal ── */}
      {showCreate && (
        <CreateUserModal
          onClose={() => setShowCreate(false)}
          onSubmit={(data) => createMutation.mutate(data)}
          loading={createMutation.isPending}
          error={createMutation.isError ? 'Error al crear el usuario. Verifica los datos.' : ''}
        />
      )}
    </div>
  )
}

function CreateUserModal({ onClose, onSubmit, loading, error }: {
  onClose: () => void
  onSubmit: (data: CreateUserData) => void
  loading: boolean
  error: string
}) {
  const [form, setForm] = useState<CreateUserData>({ correo: '', nombre: '', apellido: '', rol: 'Evaluador', password: '' })
  const set = (k: keyof CreateUserData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm({ ...form, [k]: e.target.value })

  const inputStyle: React.CSSProperties = {
    width: '100%', border: '1.5px solid #d5d8dc', borderRadius: 8, padding: '10px 14px',
    fontSize: 14, color: 'var(--gray1)', background: 'var(--white)', outline: 'none', boxSizing: 'border-box',
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(15,39,68,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{ background: 'var(--white)', borderRadius: 16, padding: 32, width: '100%', maxWidth: 460, boxShadow: 'var(--shadow-lg)' }}>
        <h2 style={{ fontFamily: '"Fraunces", serif', fontSize: 20, fontWeight: 600, color: 'var(--dark)', marginBottom: 6 }}>Nuevo usuario</h2>
        <p style={{ color: 'var(--gray2)', fontSize: 13, marginBottom: 24 }}>Crea una cuenta para un nuevo miembro del equipo.</p>

        {error && (
          <div style={{ background: '#f9ebea', border: '1px solid #e59866', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: 'var(--red)' }}>{error}</div>
        )}

        <form onSubmit={(e) => { e.preventDefault(); onSubmit(form) }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--gray1)' }}>Nombre <span style={{ color: 'var(--accent)' }}>*</span></label>
              <input type="text" required value={form.nombre} onChange={set('nombre')} style={inputStyle}
                onFocus={(e) => { e.target.style.borderColor = 'var(--light)' }}
                onBlur={(e) => { e.target.style.borderColor = '#d5d8dc' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--gray1)' }}>Apellido <span style={{ color: 'var(--accent)' }}>*</span></label>
              <input type="text" required value={form.apellido} onChange={set('apellido')} style={inputStyle}
                onFocus={(e) => { e.target.style.borderColor = 'var(--light)' }}
                onBlur={(e) => { e.target.style.borderColor = '#d5d8dc' }} />
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
            <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--gray1)' }}>Correo electrónico <span style={{ color: 'var(--accent)' }}>*</span></label>
            <input type="email" required value={form.correo} onChange={set('correo')} style={inputStyle}
              onFocus={(e) => { e.target.style.borderColor = 'var(--light)' }}
              onBlur={(e) => { e.target.style.borderColor = '#d5d8dc' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--gray1)' }}>Rol</label>
              <select value={form.rol} onChange={set('rol')} style={{ ...inputStyle, cursor: 'pointer' }}>
                {ROL_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--gray1)' }}>Contraseña <span style={{ color: 'var(--accent)' }}>*</span></label>
              <input type="password" required value={form.password} onChange={set('password')} style={inputStyle}
                onFocus={(e) => { e.target.style.borderColor = 'var(--light)' }}
                onBlur={(e) => { e.target.style.borderColor = '#d5d8dc' }} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose} style={{ background: 'transparent', color: 'var(--gray1)', border: '1.5px solid #d5d8dc', borderRadius: 8, padding: '10px 20px', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>
              Cancelar
            </button>
            <button type="submit" disabled={loading} style={{ background: 'var(--dark)', color: 'var(--white)', border: 'none', borderRadius: 8, padding: '11px 22px', fontSize: 14, fontWeight: 500, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Creando...' : 'Crear usuario'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
