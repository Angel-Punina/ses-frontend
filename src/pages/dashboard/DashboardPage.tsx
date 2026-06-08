import { useAuthStore } from '@/store/authStore'
import { authApi, type User } from '@/api/auth'
import { evaluacionesApi, type Evaluacion, CATEGORIAS, type PrecalificacionInput } from '@/api/evaluaciones'
import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { AdminView } from './AdminView'
import { ComparadorView } from './ComparadorView'
import { ReportesView } from './ReportesView'
import { CatalogoView } from './CatalogoView'

const NAV_ITEMS = [
  { icon: '▦', label: 'Dashboard', key: 'dashboard' },
  { icon: '◎', label: 'Evaluaciones', key: 'evaluaciones' },
  { icon: '⇄', label: 'Comparar', key: 'comparar' },
  { icon: '⬡', label: 'Reportes', key: 'reportes' },
  { icon: '⊞', label: 'Catálogo GUIOS', key: 'catalogo' },
]

const NAV_ADMIN = [
  { icon: '⚙', label: 'Administración', key: 'admin' },
]

function getInitials(nombre?: string, apellido?: string) {
  return `${(nombre?.[0] ?? '').toUpperCase()}${(apellido?.[0] ?? '').toUpperCase()}`
}

function getRoleBadge(rol?: string): { bg: string; color: string } {
  const map: Record<string, { bg: string; color: string }> = {
    Admin: { bg: '#f9ebea', color: 'var(--red)' },
    Evaluador: { bg: '#ebf5fb', color: 'var(--blue)' },
    Consultor: { bg: '#eafaf1', color: 'var(--green)' },
  }
  return map[rol ?? 'Evaluador'] ?? map['Evaluador']
}

const ESTADO_LABEL: Record<string, string> = {
  borrador: 'Borrador',
  paso1: 'Paso 1',
  paso2: 'Paso 2',
  paso3: 'Paso 3',
  paso4: 'Paso 4',
  paso5: 'FODA',
  completada: 'Completada',
}

const ESTADO_STYLE: Record<string, { bg: string; color: string }> = {
  borrador: { bg: '#ebf5fb', color: '#1a5276' },
  paso1: { bg: '#fef9e7', color: '#7d5a00' },
  paso2: { bg: '#fef9e7', color: '#7d5a00' },
  paso3: { bg: '#fef9e7', color: '#7d5a00' },
  paso4: { bg: '#fef9e7', color: '#7d5a00' },
  paso5: { bg: '#fef9e7', color: '#7d5a00' },
  completada: { bg: '#eafaf1', color: '#1a5e31' },
}

const RECOMENDACION_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  Adoptar: { bg: '#eafaf1', color: 'var(--green)', label: 'A — Adoptar' },
  'Con condiciones': { bg: '#fef9e7', color: 'var(--orange)', label: 'B — Con condiciones' },
  'No adoptar': { bg: '#f9ebea', color: 'var(--red)', label: 'C — No adoptar' },
}

function relTime(iso: string): string {
  const d = new Date(iso)
  const diff = Math.floor((Date.now() - d.getTime()) / 86400000)
  if (diff === 0) return 'Hoy'
  if (diff === 1) return 'Ayer'
  if (diff < 7) return `Hace ${diff} días`
  if (diff < 30) return `Hace ${Math.floor(diff / 7)} sem.`
  return d.toLocaleDateString('es', { day: 'numeric', month: 'short' })
}

export function DashboardPage() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const [activeNav, setActiveNav] = useState('dashboard')
  const [loggingOut, setLoggingOut] = useState(false)

  const handleLogout = async () => {
    setLoggingOut(true)
    try { await authApi.logout() } finally {
      logout()
      navigate('/login')
    }
  }

  const roleBadge = getRoleBadge(user?.rol)

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)' }}>
      {/* ── Sidebar ── */}
      <aside style={{
        background: 'var(--dark)', display: 'flex', flexDirection: 'column',
        position: 'fixed', top: 0, left: 0, width: 'var(--sidebar-w)', height: '100vh', zIndex: 100,
      }}>
        <div style={{
          padding: '16px 18px 14px', display: 'flex', alignItems: 'center', gap: 10,
          borderBottom: '1px solid rgba(255,255,255,0.07)',
        }}>
          <img src="/seslogo.png" alt="SES" style={{ width: 90, height: 'auto', display: 'block', borderRadius: 6 }} />
        </div>

        <nav style={{ flex: 1, padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {NAV_ITEMS.map((item) => (
            <NavButton key={item.key} item={item} active={activeNav === item.key} onClick={() => setActiveNav(item.key)} />
          ))}
          <div style={{ height: 1, background: 'rgba(255,255,255,0.07)', margin: '8px 0' }} />
          {user?.rol === 'Admin' && NAV_ADMIN.map((item) => (
            <NavButton key={item.key} item={item} active={activeNav === item.key} onClick={() => setActiveNav(item.key)} />
          ))}
        </nav>

        <div style={{ padding: '14px', borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 34, height: 34, background: 'var(--accent)', borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 700, color: 'var(--white)', flexShrink: 0,
          }}>
            {getInitials(user?.nombre, user?.apellido)}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--white)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user?.nombre} {user?.apellido}
            </span>
            <span style={{ display: 'block', fontSize: 11.5, color: '#7fb3d3' }}>{user?.rol}</span>
          </div>
          <button
            onClick={handleLogout} disabled={loggingOut} title="Cerrar sesión"
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#7fb3d3', padding: 6, borderRadius: 6, display: 'flex', alignItems: 'center', fontSize: 14 }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'var(--white)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#7fb3d3' }}
          >⏻</button>
        </div>
      </aside>

      {/* ── Main area ── */}
      <div style={{ marginLeft: 'var(--sidebar-w)', flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <header style={{
          height: 'var(--topbar-h)', background: 'var(--white)',
          borderBottom: '1px solid rgba(0,0,0,0.07)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 32px', position: 'sticky', top: 0, zIndex: 50, flexShrink: 0,
        }}>
          <span style={{ fontFamily: '"Fraunces", serif', fontSize: 16, fontWeight: 600, color: 'var(--dark)' }}>
            {activeNav === 'dashboard' ? 'Dashboard' : activeNav === 'evaluaciones' ? 'Evaluaciones' : activeNav === 'comparar' ? 'Comparar' : activeNav === 'reportes' ? 'Reportes' : activeNav === 'catalogo' ? 'Catálogo GUIOS' : 'Administración'}
          </span>
          <span style={{ fontSize: 12, fontWeight: 600, background: roleBadge.bg, color: roleBadge.color, padding: '3px 10px', borderRadius: 20 }}>
            {user?.rol}
          </span>
        </header>

        <main style={{ padding: '28px 32px', flex: 1 }}>
          {activeNav === 'dashboard' && <DashboardHome user={user} onNewEval={() => setActiveNav('evaluaciones')} />}
          {activeNav === 'evaluaciones' && <EvaluacionesView />}
          {activeNav === 'comparar' && <ComparadorView />}
          {activeNav === 'reportes' && <ReportesView />}
          {activeNav === 'catalogo' && <CatalogoView />}
          {activeNav === 'admin' && <AdminView />}
        </main>
      </div>
    </div>
  )
}

function NavButton({ item, active, onClick }: { item: { icon: string; label: string }; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 12px', borderRadius: 8,
        color: active ? 'var(--white)' : '#7fb3d3',
        background: active ? 'rgba(46,134,193,0.22)' : 'transparent',
        fontWeight: active ? 500 : 450, fontSize: 13.5,
        cursor: 'pointer', border: 'none', textAlign: 'left', width: '100%',
        transition: 'background 0.18s, color 0.18s',
      }}
      onMouseEnter={(e) => { if (!active) { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; e.currentTarget.style.color = '#aed6f1' } }}
      onMouseLeave={(e) => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#7fb3d3' } }}
    >
      <span style={{ fontSize: 15, lineHeight: 1 }}>{item.icon}</span>
      {item.label}
    </button>
  )
}

function DashboardHome({ user, onNewEval }: { user: User | null; onNewEval: () => void }) {
  const { data: evals = [] } = useQuery({ queryKey: ['evaluaciones'], queryFn: evaluacionesApi.list })
  const { data: catalogo = [] } = useQuery({ queryKey: ['catalogo'], queryFn: evaluacionesApi.catalogo, staleTime: 10 * 60 * 1000 })

  const completed = evals.filter((e) => e.estado === 'completada').length
  const inProgress = evals.filter((e) => e.estado !== 'completada' && e.estado !== 'borrador').length
  const sfIa = catalogo.reduce((acc, d) => acc + d.factores.reduce((a, f) => a + f.subfactores.filter((s) => s.origen === 'ia').length, 0), 0)

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14, marginBottom: 22, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ fontFamily: '"Fraunces", serif', fontSize: 22, fontWeight: 600, color: 'var(--dark)', marginBottom: 3 }}>
            Bienvenido, {user?.nombre}
          </h2>
          <p style={{ color: 'var(--gray2)', fontSize: 13, lineHeight: 1.5 }}>
            Gestiona tus evaluaciones de adopción de software libre con la metodología GUIOS.
          </p>
        </div>
        <button
          onClick={onNewEval}
          style={{ background: 'var(--dark)', color: 'var(--white)', border: 'none', borderRadius: 8, padding: '11px 22px', fontSize: 14, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--mid)' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--dark)' }}
        >+ Nueva Evaluación</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 18 }}>
        {[
          { icon: '◎', bg: '#ebf5fb', color: 'var(--blue)', label: 'Evaluaciones', value: evals.length },
          { icon: '✓', bg: '#eafaf1', color: 'var(--green)', label: 'Completadas', value: completed },
          { icon: '◑', bg: '#fef9e7', color: 'var(--orange)', label: 'En progreso', value: inProgress },
          { icon: '⊕', bg: '#e8f8f5', color: '#0e6655', label: 'Subfactores IA activos', value: sfIa },
        ].map((stat) => (
          <div key={stat.label} style={{ background: 'var(--white)', border: '1px solid rgba(0,0,0,0.07)', borderRadius: 'var(--radius)', padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 12, boxShadow: 'var(--shadow)' }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: stat.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, color: stat.color, flexShrink: 0 }}>
              {stat.icon}
            </div>
            <div>
              <span style={{ display: 'block', fontFamily: '"Fraunces", serif', fontSize: 24, fontWeight: 700, color: 'var(--dark)', lineHeight: 1.1 }}>{stat.value}</span>
              <span style={{ display: 'block', fontSize: 11.5, color: 'var(--gray2)', marginTop: 1 }}>{stat.label}</span>
            </div>
          </div>
        ))}
      </div>

      {/* IA active banner */}
      {sfIa > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', background: '#e8f8f5', border: '1px solid #a2d9ce', borderRadius: 8, marginBottom: 18, fontSize: 12.5 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#0e6655', flexShrink: 0 }} />
          <span style={{ color: '#0e6655', fontWeight: 500 }}>Enriquecimiento IA activa</span>
          <span style={{ color: '#0e6655', opacity: 0.7 }}>— {sfIa} subfactores aprobados participan en el cálculo de PM</span>
        </div>
      )}

      {evals.length === 0 ? (
        <div style={{ background: 'var(--white)', border: '1.5px dashed #d5d8dc', borderRadius: 'var(--radius)', padding: '60px 32px', textAlign: 'center', boxShadow: 'var(--shadow)' }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: '#ebf5fb', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 24, color: 'var(--blue)' }}>◎</div>
          <h3 style={{ fontFamily: '"Fraunces", serif', fontSize: 17, fontWeight: 600, color: 'var(--dark)', marginBottom: 8 }}>No tienes evaluaciones aún</h3>
          <p style={{ color: 'var(--gray2)', fontSize: 13.5, lineHeight: 1.6, maxWidth: 400, margin: '0 auto 24px' }}>
            Crea tu primera evaluación GUIOS para analizar la adopción de un proyecto de software libre.
          </p>
          <button
            onClick={onNewEval}
            style={{ background: 'var(--dark)', color: 'var(--white)', border: 'none', borderRadius: 8, padding: '11px 26px', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--mid)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--dark)' }}
          >Nueva Evaluación</button>
        </div>
      ) : (
        <div style={{ background: 'var(--white)', border: '1px solid rgba(0,0,0,0.07)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #f2f3f4' }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--dark)' }}>Evaluaciones recientes</h3>
            <button onClick={onNewEval} style={{ fontSize: 12, color: 'var(--light)', fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer' }}>+ Nueva</button>
          </div>
          <EvalTable evals={evals.slice(0, 6)} />
        </div>
      )}
    </>
  )
}

function EvaluacionesView() {
  const { data: evals = [], isLoading } = useQuery({ queryKey: ['evaluaciones'], queryFn: evaluacionesApi.list })
  const [showModal, setShowModal] = useState(false)

  const existingOrgs = [...new Set(evals.map((e) => e.organizacion).filter(Boolean))]

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14, marginBottom: 22, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ fontFamily: '"Fraunces", serif', fontSize: 22, fontWeight: 600, color: 'var(--dark)', marginBottom: 3 }}>Evaluaciones</h2>
          <p style={{ color: 'var(--gray2)', fontSize: 13 }}>Gestiona tus evaluaciones de software libre</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          style={{ background: 'var(--dark)', color: 'var(--white)', border: 'none', borderRadius: 8, padding: '11px 22px', fontSize: 14, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--mid)' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--dark)' }}
        >+ Nueva Evaluación</button>
      </div>

      {isLoading ? (
        <div style={{ color: 'var(--gray2)', fontSize: 13, padding: 20 }}>Cargando...</div>
      ) : evals.length === 0 ? (
        <div style={{ background: 'var(--white)', border: '1.5px dashed #d5d8dc', borderRadius: 'var(--radius)', padding: '60px 32px', textAlign: 'center', boxShadow: 'var(--shadow)' }}>
          <p style={{ color: 'var(--gray2)', fontSize: 14, marginBottom: 20 }}>No tienes evaluaciones. Crea una nueva para comenzar.</p>
          <button onClick={() => setShowModal(true)} style={{ background: 'var(--dark)', color: 'var(--white)', border: 'none', borderRadius: 8, padding: '11px 22px', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>
            Nueva Evaluación
          </button>
        </div>
      ) : (
        <div style={{ background: 'var(--white)', border: '1px solid rgba(0,0,0,0.07)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)', overflow: 'hidden' }}>
          <EvalTable evals={evals} />
        </div>
      )}

      {showModal && (
        <NuevaEvaluacionModal
          onClose={() => setShowModal(false)}
          existingOrgs={existingOrgs}
        />
      )}
    </>
  )
}

function ConfirmDeleteModal({
  nombre, software, onConfirm, onCancel, loading,
}: {
  nombre: string; software: string; onConfirm: () => void; onCancel: () => void; loading: boolean
}) {
  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(15,39,68,0.55)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel() }}
    >
      <div style={{ background: 'var(--white)', borderRadius: 16, padding: 32, width: '100%', maxWidth: 420, boxShadow: '0 20px 60px rgba(0,0,0,0.22)' }}>
        <div style={{ width: 52, height: 52, borderRadius: 14, background: '#f9ebea', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, margin: '0 auto 18px' }}>⚠</div>
        <h3 style={{ fontFamily: '"Fraunces", serif', fontSize: 18, fontWeight: 700, color: 'var(--dark)', textAlign: 'center', marginBottom: 10 }}>
          Eliminar evaluación
        </h3>
        <p style={{ color: 'var(--gray2)', fontSize: 13.5, lineHeight: 1.6, textAlign: 'center', marginBottom: 6 }}>
          Estás a punto de eliminar permanentemente:
        </p>
        <div style={{ background: '#fafbfc', border: '1px solid #eaecee', borderRadius: 10, padding: '12px 16px', marginBottom: 20, textAlign: 'center' }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--dark)' }}>{nombre}</div>
          <div style={{ fontSize: 12, color: 'var(--gray2)', marginTop: 3 }}>{software}</div>
        </div>
        <p style={{ color: 'var(--red)', fontSize: 12.5, textAlign: 'center', marginBottom: 24, fontWeight: 500 }}>
          Esta acción es irreversible y no se puede deshacer.
        </p>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={onCancel} disabled={loading}
            style={{ flex: 1, padding: '11px 0', borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: 'pointer', background: 'transparent', color: 'var(--gray1)', border: '1.5px solid #d5d8dc', transition: 'all 0.12s' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#f2f3f4' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm} disabled={loading}
            style={{ flex: 1, padding: '11px 0', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', background: loading ? '#e59866' : 'var(--red)', color: 'var(--white)', border: 'none', opacity: loading ? 0.75 : 1, transition: 'all 0.12s' }}
            onMouseEnter={(e) => { if (!loading) e.currentTarget.style.background = '#c0392b' }}
            onMouseLeave={(e) => { if (!loading) e.currentTarget.style.background = 'var(--red)' }}
          >
            {loading ? 'Eliminando...' : 'Sí, eliminar'}
          </button>
        </div>
      </div>
    </div>
  )
}

function EvalTable({ evals, onDeleteSuccess }: { evals: Evaluacion[]; onDeleteSuccess?: () => void }) {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; nombre: string; software: string } | null>(null)

  const deleteMutation = useMutation({
    mutationFn: (id: number) => evaluacionesApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['evaluaciones'] })
      setDeleteTarget(null)
      onDeleteSuccess?.()
    },
  })

  const handleDelete = (e: React.MouseEvent, ev: Evaluacion) => {
    e.stopPropagation()
    setDeleteTarget({ id: ev.id, nombre: ev.nombre, software: ev.software })
  }

  const TH: React.CSSProperties = {
    fontSize: 10.5, fontWeight: 600, color: 'var(--gray2)', textTransform: 'uppercase',
    letterSpacing: '.04em', padding: '9px 14px', textAlign: 'left',
    background: '#fafbfc', borderBottom: '1px solid #eaecee',
  }

  return (
    <>
    {deleteTarget && (
      <ConfirmDeleteModal
        nombre={deleteTarget.nombre}
        software={deleteTarget.software}
        onConfirm={() => deleteMutation.mutate(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
        loading={deleteMutation.isPending}
      />
    )}
    <div style={{ overflow: 'hidden', borderRadius: 'var(--radius)' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={TH}>Software</th>
            <th style={TH}>Estado</th>
            <th style={TH}>Progreso</th>
            <th style={TH}>Actividad</th>
            <th style={{ ...TH, textAlign: 'right' }}></th>
          </tr>
        </thead>
        <tbody>
          {evals.map((ev, i) => {
            const paso = ev.paso_numero
            const pct = Math.round((paso / 6) * 100)
            const isCompleted = ev.estado === 'completada'
            const estadoStyle = ESTADO_STYLE[ev.estado] ?? ESTADO_STYLE['borrador']
            const recStyle = ev.recomendacion ? RECOMENDACION_STYLE[ev.recomendacion] : null

            return (
              <tr
                key={ev.id}
                style={{ borderBottom: i < evals.length - 1 ? '1px solid #f2f3f4' : 'none', cursor: 'pointer', transition: 'background 0.12s' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#fafbfc' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                onClick={() => navigate(`/evaluacion/${ev.id}${isCompleted ? '?paso=6' : ''}`)}
              >
                <td style={{ padding: '12px 14px', maxWidth: 260 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--dark)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {ev.nombre}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 11.5, color: 'var(--gray2)' }}>
                      {ev.software}{ev.organizacion ? ` · ${ev.organizacion}` : ''}
                    </span>
                    {ev.categoria && ev.categoria !== 'otro' && (
                      <span style={{ fontSize: 10, fontWeight: 600, padding: '1px 7px', borderRadius: 99, background: '#ebf5fb', color: '#1a5276', border: '1px solid #aed6f1', whiteSpace: 'nowrap' }}>
                        {CATEGORIAS.find((c) => c.value === ev.categoria)?.label ?? ev.categoria}
                      </span>
                    )}
                  </div>
                </td>
                <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 99, background: estadoStyle.bg, color: estadoStyle.color }}>
                      {ESTADO_LABEL[ev.estado] ?? ev.estado}
                    </span>
                    {recStyle && (
                      <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 99, background: recStyle.bg, color: recStyle.color }}>
                        {recStyle.label}
                      </span>
                    )}
                  </div>
                </td>
                <td style={{ padding: '12px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 72, height: 4, background: '#eaecee', borderRadius: 99, overflow: 'hidden' }}>
                      <div style={{ height: '100%', borderRadius: 99, width: `${pct}%`, background: isCompleted ? 'var(--green)' : 'var(--light)', transition: 'width 0.4s' }} />
                    </div>
                    <span style={{ fontSize: 11, color: 'var(--gray2)', whiteSpace: 'nowrap' }}>{paso}/6</span>
                  </div>
                </td>
                <td style={{ padding: '12px 14px', fontSize: 12, color: 'var(--gray2)', whiteSpace: 'nowrap' }}>
                  {relTime(ev.actualizada)}
                </td>
                <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                  <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }} onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => navigate(`/evaluacion/${ev.id}${isCompleted ? '?paso=6' : ''}`)}
                      style={{
                        padding: '5px 12px', borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: 'pointer',
                        background: isCompleted ? 'transparent' : 'var(--dark)', color: isCompleted ? 'var(--gray1)' : 'var(--white)',
                        border: isCompleted ? '1px solid #d5d8dc' : 'none', transition: 'all 0.12s',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = isCompleted ? '#f2f3f4' : 'var(--mid)' }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = isCompleted ? 'transparent' : 'var(--dark)' }}
                    >
                      {isCompleted ? 'Ver reporte' : 'Continuar'}
                    </button>
                    <button
                      onClick={(e) => handleDelete(e, ev)}
                      disabled={deleteMutation.isPending}
                      style={{ padding: '5px 10px', borderRadius: 6, fontSize: 12, cursor: 'pointer', background: 'transparent', color: 'var(--gray2)', border: '1px solid #d5d8dc', transition: 'all 0.12s' }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = '#f9ebea'; e.currentTarget.style.color = 'var(--red)'; e.currentTarget.style.borderColor = '#f0b0a8' }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--gray2)'; e.currentTarget.style.borderColor = '#d5d8dc' }}
                    >
                      ✕
                    </button>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
    </>
  )
}

const PROPOSITO_OPTIONS = [
  { value: '', label: 'Seleccionar propósito...' },
  { value: 'gestion_interna', label: 'Gestión interna (admin, RRHH, finanzas)' },
  { value: 'educacion', label: 'Educación y formación' },
  { value: 'produccion', label: 'Producción y manufactura (ERP)' },
  { value: 'infraestructura', label: 'Infraestructura TI' },
  { value: 'investigacion', label: 'Investigación y desarrollo' },
]

const TAMANO_OPTIONS = [
  { value: '', label: 'Seleccionar tamaño...' },
  { value: 'micro', label: 'Micro — 1 a 10 personas' },
  { value: 'pequena', label: 'Pequeña — 11 a 50 personas' },
  { value: 'mediana', label: 'Mediana — 51 a 200 personas' },
  { value: 'grande', label: 'Grande — más de 200 personas' },
]

function NuevaEvaluacionModal({ onClose, existingOrgs }: {
  onClose: () => void
  existingOrgs: string[]
}) {
  const navigate = useNavigate()
  const qc = useQueryClient()

  const [form, setForm] = useState({
    nombre: '', software: '', organizacion: '', descripcion: '', categoria: 'otro',
  })
  const [usarPrecal, setUsarPrecal] = useState(false)
  const [extras, setExtras] = useState<PrecalificacionInput>({
    proposito: '', tamano_organizacion: '', software_reemplaza: '',
  })
  const [phase, setPhase] = useState<'idle' | 'creating' | 'analyzing'>('idle')
  const [error, setError] = useState('')

  const selectArrow = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%23888' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`

  const inputStyle: React.CSSProperties = {
    width: '100%', border: '1.5px solid #d5d8dc', borderRadius: 8, padding: '10px 14px',
    fontSize: 14, color: 'var(--gray1)', background: 'var(--white)', outline: 'none', boxSizing: 'border-box',
  }
  const selectStyle: React.CSSProperties = {
    ...inputStyle, cursor: 'pointer', appearance: 'none',
    backgroundImage: selectArrow, backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 12px center', paddingRight: 36,
  }

  const focusIn = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    e.target.style.borderColor = 'var(--light)'; e.target.style.boxShadow = '0 0 0 3px rgba(46,134,193,0.12)'
  }
  const focusOut = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    e.target.style.borderColor = '#d5d8dc'; e.target.style.boxShadow = 'none'
  }

  const descMin = 80
  const descOk = !usarPrecal || form.descripcion.trim().length >= descMin
  const canSubmit = phase === 'idle' && form.nombre && form.software && descOk

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    setError('')
    setPhase('creating')
    try {
      const evaluacion = await evaluacionesApi.create(form)
      qc.invalidateQueries({ queryKey: ['evaluaciones'] })

      if (usarPrecal) {
        setPhase('analyzing')
        try {
          await evaluacionesApi.precalificacion(evaluacion.id, {
            proposito: extras.proposito || undefined,
            tamano_organizacion: extras.tamano_organizacion || undefined,
            software_reemplaza: extras.software_reemplaza || undefined,
          })
        } catch {
          // Pre-qualification failed gracefully — proceed to paso1 anyway
        }
      }

      onClose()
      navigate(`/evaluacion/${evaluacion.id}?paso=1`)
    } catch {
      setError('Error al crear la evaluación. Verifica los datos e intenta de nuevo.')
      setPhase('idle')
    }
  }

  const isLoading = phase !== 'idle'

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(15,39,68,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, overflowY: 'auto' }}
      onClick={(e) => { if (e.target === e.currentTarget && !isLoading) onClose() }}
    >
      <div style={{ background: 'var(--white)', borderRadius: 16, padding: 32, width: '100%', maxWidth: 540, boxShadow: 'var(--shadow-lg)', margin: 'auto' }}>
        <h2 style={{ fontFamily: '"Fraunces", serif', fontSize: 20, fontWeight: 600, color: 'var(--dark)', marginBottom: 6 }}>Nueva Evaluación</h2>
        <p style={{ color: 'var(--gray2)', fontSize: 13, marginBottom: 22 }}>Completa los datos para iniciar la evaluación GUIOS.</p>

        {error && (
          <div style={{ background: '#f9ebea', border: '1px solid #e59866', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: 'var(--red)' }}>{error}</div>
        )}

        {/* Loading overlay */}
        {isLoading && (
          <div style={{ background: '#ebf5fb', border: '1px solid #aed6f1', borderRadius: 10, padding: '14px 18px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 20, height: 20, border: '2.5px solid #aed6f1', borderTopColor: 'var(--blue)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', flexShrink: 0 }} />
            <span style={{ fontSize: 13.5, color: 'var(--blue)', fontWeight: 500 }}>
              {phase === 'creating' ? 'Creando evaluación...' : 'Analizando con IA — esto puede tomar unos segundos...'}
            </span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Nombre */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
            <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--gray1)' }}>Nombre de la evaluación <span style={{ color: 'var(--accent)' }}>*</span></label>
            <input type="text" required value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              placeholder="Ej: Evaluación LibreOffice 2025" style={inputStyle} disabled={isLoading}
              onFocus={focusIn} onBlur={focusOut} />
          </div>

          {/* Software + Organización */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--gray1)' }}>Software <span style={{ color: 'var(--accent)' }}>*</span></label>
              <input type="text" required value={form.software} onChange={(e) => setForm({ ...form, software: e.target.value })}
                placeholder="Odoo, LibreOffice..." style={inputStyle} disabled={isLoading}
                onFocus={focusIn} onBlur={focusOut} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--gray1)' }}>Organización</label>
              <input
                type="text" list="orgs-list" value={form.organizacion}
                onChange={(e) => setForm({ ...form, organizacion: e.target.value })}
                placeholder="Empresa / Entidad" style={inputStyle} disabled={isLoading}
                onFocus={focusIn} onBlur={focusOut}
              />
              {existingOrgs.length > 0 && (
                <datalist id="orgs-list">
                  {existingOrgs.map((org) => <option key={org} value={org} />)}
                </datalist>
              )}
            </div>
          </div>

          {/* Categoría */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
            <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--gray1)' }}>Categoría <span style={{ color: 'var(--accent)' }}>*</span></label>
            <select value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })}
              style={selectStyle} disabled={isLoading} onFocus={focusIn} onBlur={focusOut}>
              {CATEGORIAS.map((cat) => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>
          </div>

          {/* Descripción */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 18 }}>
            <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--gray1)' }}>
              Descripción {usarPrecal && <span style={{ color: 'var(--accent)' }}>*</span>}
              {usarPrecal && (
                <span style={{ fontWeight: 400, color: 'var(--gray2)', marginLeft: 6 }}>
                  (mín. {descMin} caracteres para la IA)
                </span>
              )}
            </label>
            <textarea
              value={form.descripcion}
              onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
              placeholder={usarPrecal
                ? 'Describe el software, para qué lo necesitas, qué problemas resolverá y el contexto de uso. Cuanto más detalle, mejor análisis obtendrá la IA.'
                : 'Contexto de la evaluación...'}
              rows={usarPrecal ? 4 : 2}
              style={{ ...inputStyle, resize: 'vertical' }}
              disabled={isLoading}
              onFocus={focusIn} onBlur={focusOut}
            />
            {usarPrecal && (
              <span style={{ fontSize: 11.5, color: form.descripcion.trim().length >= descMin ? 'var(--green)' : 'var(--gray2)', textAlign: 'right' }}>
                {form.descripcion.trim().length} / {descMin} caracteres
              </span>
            )}
          </div>

          {/* Precalificación IA toggle */}
          <div style={{ border: '1.5px solid #d2b4de', borderRadius: 10, padding: '14px 16px', marginBottom: 22, background: usarPrecal ? '#fdf7ff' : '#fafbfc' }}>
            <button
              type="button"
              onClick={() => setUsarPrecal(!usarPrecal)}
              disabled={isLoading}
              style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0 }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 38, height: 21, borderRadius: 99, transition: 'background 0.2s',
                  background: usarPrecal ? '#7d3c98' : '#d5d8dc', position: 'relative', flexShrink: 0,
                }}>
                  <div style={{
                    width: 15, height: 15, borderRadius: '50%', background: 'white',
                    position: 'absolute', top: 3, left: usarPrecal ? 20 : 3,
                    transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                  }} />
                </div>
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: usarPrecal ? '#6c3483' : 'var(--dark)' }}>
                    Usar precalificación IA
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--gray2)', lineHeight: 1.4, marginTop: 1 }}>
                    Claude analizará el contexto y pre-sugerirá valoraciones para el Paso 1
                  </div>
                </div>
              </div>
            </button>

            {usarPrecal && (
              <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid #e8d5f5', display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <label style={{ fontSize: 12.5, fontWeight: 500, color: '#6c3483' }}>Propósito de uso</label>
                    <select
                      value={extras.proposito} onChange={(e) => setExtras({ ...extras, proposito: e.target.value })}
                      style={{ ...selectStyle, fontSize: 12.5 }} disabled={isLoading} onFocus={focusIn} onBlur={focusOut}
                    >
                      {PROPOSITO_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <label style={{ fontSize: 12.5, fontWeight: 500, color: '#6c3483' }}>Tamaño de la organización</label>
                    <select
                      value={extras.tamano_organizacion} onChange={(e) => setExtras({ ...extras, tamano_organizacion: e.target.value })}
                      style={{ ...selectStyle, fontSize: 12.5 }} disabled={isLoading} onFocus={focusIn} onBlur={focusOut}
                    >
                      {TAMANO_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 12.5, fontWeight: 500, color: '#6c3483' }}>¿Qué solución actual reemplazaría? <span style={{ fontWeight: 400, color: 'var(--gray2)' }}>(opcional)</span></label>
                  <input type="text" value={extras.software_reemplaza}
                    onChange={(e) => setExtras({ ...extras, software_reemplaza: e.target.value })}
                    placeholder="Excel, SAP, solución en papel..." style={{ ...inputStyle, fontSize: 12.5 }}
                    disabled={isLoading} onFocus={focusIn} onBlur={focusOut}
                  />
                </div>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose} disabled={isLoading}
              style={{ background: 'transparent', color: 'var(--gray1)', border: '1.5px solid #d5d8dc', borderRadius: 8, padding: '10px 20px', fontSize: 14, fontWeight: 500, cursor: isLoading ? 'not-allowed' : 'pointer', opacity: isLoading ? 0.6 : 1 }}>
              Cancelar
            </button>
            <button type="submit" disabled={!canSubmit}
              style={{ background: 'var(--dark)', color: 'var(--white)', border: 'none', borderRadius: 8, padding: '11px 22px', fontSize: 14, fontWeight: 500, cursor: !canSubmit ? 'not-allowed' : 'pointer', opacity: !canSubmit ? 0.65 : 1 }}>
              {phase === 'creating' ? 'Creando...' : phase === 'analyzing' ? 'Analizando...' : 'Comenzar evaluación →'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
