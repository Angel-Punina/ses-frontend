import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  evaluacionesApi,
  type Dimension, type Factor, type SubfactorProposal,
  type SubfactorObsolescenceReport, type Subfactor,
} from '@/api/evaluaciones'
import { useAuthStore } from '@/store/authStore'

const DIM_STYLE: Record<string, { bg: string; color: string; border: string; dot: string }> = {
  T: { bg: '#ebf5fb', color: '#1a5276', border: '#aed6f1', dot: '#2980b9' },
  O: { bg: '#eafaf1', color: '#1e8449', border: '#a9dfbf', dot: '#27ae60' },
  E: { bg: '#fef9e7', color: '#b7770d', border: '#f9e79f', dot: '#d4ac0d' },
}

const IS_STYLE: Record<number, { bg: string; color: string; label: string }> = {
  1: { bg: '#f9ebea', color: '#922b21', label: 'IS=1' },
  2: { bg: '#fef9e7', color: '#7d6608', label: 'IS=2' },
  3: { bg: '#ebf5fb', color: '#154360', label: 'IS=3' },
  4: { bg: '#eafaf1', color: '#1a5e31', label: 'IS=4' },
}

const IMPACTO_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  interno: { bg: '#f5eef8', color: '#6c3483', label: 'Interno' },
  externo: { bg: '#e8f8f5', color: '#0e6655', label: 'Externo' },
}

function confBadge(val: number) {
  if (val >= 0.8) return { bg: '#eafaf1', color: '#1e8449', border: '#a9dfbf', label: 'Alta' }
  if (val >= 0.65) return { bg: '#fef9e7', color: '#9a7d0a', border: '#f9e79f', label: 'Media' }
  return { bg: '#fdf2f8', color: '#a93226', border: '#f5cba7', label: 'Baja' }
}

function obsBadge(val: number) {
  if (val >= 0.8) return { bg: '#f9ebea', color: '#922b21', border: '#f5b7b1', label: 'Alta' }
  if (val >= 0.65) return { bg: '#fef9e7', color: '#9a7d0a', border: '#f9e79f', label: 'Media' }
  return { bg: '#fdf2f8', color: '#a93226', border: '#f5cba7', label: 'Baja' }
}

function IaBadge() {
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 99,
      background: '#e8f8f5', color: '#0e6655', border: '1px solid #a2d9ce',
    }}>IA 2020-2026</span>
  )
}

function ObsBadge({ confianza }: { confianza: number }) {
  const b = obsBadge(confianza)
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 99,
      background: b.bg, color: b.color, border: `1px solid ${b.border}`,
      display: 'flex', alignItems: 'center', gap: 3,
    }}>
      ⚠ Obs. {Math.round(confianza * 100)}%
    </span>
  )
}

// ── Inline subfactor editor ──────────────────────────────────────────────────

function SubfactorEditRow({
  sf, obsReport, isAdmin, onUpdated,
}: {
  sf: Subfactor
  obsReport?: SubfactorObsolescenceReport
  isAdmin: boolean
  onUpdated: (updated: Subfactor) => void
}) {
  const [editing, setEditing] = useState(false)
  const [nombre, setNombre] = useState(sf.nombre)
  const [descripcion, setDescripcion] = useState(sf.descripcion)
  const [activo, setActivo] = useState(sf.activo)

  const qc = useQueryClient()

  const mutation = useMutation({
    mutationFn: (data: { nombre?: string; descripcion?: string; activo?: boolean }) =>
      evaluacionesApi.updateSubfactor(sf.id, data),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: ['catalogo'] })
      onUpdated(updated)
      setEditing(false)
    },
  })

  const inputStyle: React.CSSProperties = {
    width: '100%', border: '1.5px solid #d5d8dc', borderRadius: 6, padding: '6px 10px',
    fontSize: 12.5, color: 'var(--gray1)', background: 'var(--white)', outline: 'none',
    boxSizing: 'border-box',
  }

  if (editing) {
    return (
      <div style={{ background: '#f0f7ff', border: '1.5px solid #aed6f1', borderRadius: 8, padding: '12px 14px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div>
            <label style={{ fontSize: 11, color: 'var(--gray2)', fontWeight: 500, display: 'block', marginBottom: 3 }}>Nombre</label>
            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              style={inputStyle}
              onFocus={(e) => { e.target.style.borderColor = 'var(--light)' }}
              onBlur={(e) => { e.target.style.borderColor = '#d5d8dc' }}
            />
          </div>
          <div>
            <label style={{ fontSize: 11, color: 'var(--gray2)', fontWeight: 500, display: 'block', marginBottom: 3 }}>Descripción</label>
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              rows={2}
              style={{ ...inputStyle, resize: 'vertical' }}
              onFocus={(e) => { (e.target as HTMLTextAreaElement).style.borderColor = 'var(--light)' }}
              onBlur={(e) => { (e.target as HTMLTextAreaElement).style.borderColor = '#d5d8dc' }}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12.5, color: 'var(--gray1)' }}>
              <input
                type="checkbox"
                checked={activo}
                onChange={(e) => setActivo(e.target.checked)}
                style={{ width: 14, height: 14, cursor: 'pointer' }}
              />
              Activo en el catálogo
            </label>
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
            <button
              onClick={() => { setNombre(sf.nombre); setDescripcion(sf.descripcion); setActivo(sf.activo); setEditing(false) }}
              style={{ background: 'transparent', border: '1.5px solid #d5d8dc', borderRadius: 6, padding: '5px 14px', fontSize: 12, cursor: 'pointer', color: 'var(--gray1)' }}
            >
              Cancelar
            </button>
            <button
              onClick={() => mutation.mutate({ nombre, descripcion, activo })}
              disabled={mutation.isPending}
              style={{ background: 'var(--dark)', color: 'var(--white)', border: 'none', borderRadius: 6, padding: '5px 14px', fontSize: 12, fontWeight: 500, cursor: 'pointer' }}
            >
              {mutation.isPending ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
          {mutation.isError && (
            <div style={{ fontSize: 12, color: 'var(--red)' }}>Error al guardar. Intenta de nuevo.</div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
      <span style={{
        fontSize: 9.5, fontFamily: '"DM Mono", monospace', color: 'var(--gray3)',
        background: '#eaecee', padding: '2px 5px', borderRadius: 4, flexShrink: 0, marginTop: 2,
      }}>{sf.codigo}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <span style={{ fontSize: 12.5, color: activo ? 'var(--dark)' : 'var(--gray3)', lineHeight: 1.5, textDecoration: activo ? 'none' : 'line-through' }}>
          {nombre}
        </span>
        {descripcion && (
          <p style={{ fontSize: 11.5, color: 'var(--gray2)', margin: '2px 0 0', lineHeight: 1.45 }}>{descripcion}</p>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
        {sf.origen === 'ia' && <IaBadge />}
        {!activo && (
          <span style={{ fontSize: 10, color: 'var(--gray3)', background: '#f2f3f4', padding: '1px 6px', borderRadius: 99 }}>inactivo</span>
        )}
        {obsReport && obsReport.estado === 'pendiente' && (
          <ObsBadge confianza={obsReport.confianza} />
        )}
        {isAdmin && (
          <button
            onClick={() => setEditing(true)}
            title="Editar subfactor"
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--gray2)', padding: '2px 4px', borderRadius: 4, fontSize: 13, lineHeight: 1 }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#eaecee'; e.currentTarget.style.color = 'var(--dark)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--gray2)' }}
          >
            ✎
          </button>
        )}
      </div>
    </div>
  )
}

// ── FactorCard ───────────────────────────────────────────────────────────────

function FactorCard({
  factor, dimCode, isAdmin, obsReports,
}: {
  factor: Factor
  dimCode: string
  isAdmin: boolean
  obsReports: SubfactorObsolescenceReport[]
}) {
  const [open, setOpen] = useState(false)
  const [localSfs, setLocalSfs] = useState<typeof factor.subfactores>(factor.subfactores)

  useEffect(() => {
    setLocalSfs(factor.subfactores)
  }, [factor.subfactores])

  const ds = DIM_STYLE[dimCode] ?? DIM_STYLE['T']
  const is = IS_STYLE[factor.is_valor] ?? IS_STYLE[3]
  const imp = factor.es_factor_soporte
    ? { bg: '#fdf2e9', color: '#784212', label: '★ Dual' }
    : IMPACTO_STYLE[factor.tipo_impacto] ?? IMPACTO_STYLE['externo']

  const sfTotal = localSfs.length
  const sfIa = localSfs.filter((s) => s.origen === 'ia').length
  const sfObs = obsReports.filter((r) => r.estado === 'pendiente').length

  const sfMap = new Map(obsReports.map((r) => [r.subfactor_id, r]))

  return (
    <div style={{ border: '1px solid #eaecee', borderRadius: 10, overflow: 'hidden', background: 'var(--white)', marginBottom: 8 }}>
      <button
        onClick={() => setOpen(!open)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
        onMouseEnter={(e) => { e.currentTarget.style.background = '#fafbfc' }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'none' }}
      >
        <span style={{ fontSize: 10, fontFamily: '"DM Mono", monospace', fontWeight: 600, background: ds.bg, color: ds.color, padding: '2px 7px', borderRadius: 6, border: `1px solid ${ds.border}`, flexShrink: 0 }}>
          {factor.codigo}
        </span>
        <span style={{ flex: 1, fontSize: 13.5, fontWeight: 500, color: 'var(--dark)' }}>{factor.nombre}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <span style={{ fontSize: 10.5, fontWeight: 600, padding: '2px 8px', borderRadius: 99, background: is.bg, color: is.color }}>{is.label}</span>
          <span style={{ fontSize: 10.5, fontWeight: 600, padding: '2px 8px', borderRadius: 99, background: imp.bg, color: imp.color }}>{imp.label}</span>
          <span style={{ fontSize: 11.5, color: 'var(--gray2)', minWidth: 60, textAlign: 'right' }}>
            {sfTotal} SF{sfIa > 0 ? ` · ${sfIa} IA` : ''}{sfObs > 0 ? ` · ${sfObs} ⚠` : ''}
          </span>
          <span style={{ fontSize: 13, color: 'var(--gray2)', transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }}>›</span>
        </div>
      </button>

      {open && (
        <div style={{ borderTop: '1px solid #f2f3f4', background: '#fafbfc' }}>
          {factor.descripcion && (
            <div style={{ padding: '10px 16px 0', fontSize: 12, color: 'var(--gray2)', fontStyle: 'italic' }}>{factor.descripcion}</div>
          )}
          <div style={{ padding: '10px 16px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {localSfs.map((sf) => (
              <SubfactorEditRow
                key={sf.id}
                sf={sf}
                obsReport={sfMap.get(sf.id)}
                isAdmin={isAdmin}
                onUpdated={(updated) => setLocalSfs((prev) => prev.map((s) => s.id === updated.id ? updated : s))}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── DimensionSection ─────────────────────────────────────────────────────────

function DimensionSection({
  dim, isAdmin, obsReports,
}: {
  dim: Dimension
  isAdmin: boolean
  obsReports: SubfactorObsolescenceReport[]
}) {
  const [open, setOpen] = useState(false)
  const ds = DIM_STYLE[dim.codigo] ?? DIM_STYLE['T']
  const sfTotal = dim.factores.reduce((acc, f) => acc + f.subfactores.length, 0)
  const sfIa = dim.factores.reduce((acc, f) => acc + f.subfactores.filter((s) => s.origen === 'ia').length, 0)
  const DIM_LABEL: Record<string, string> = { T: 'Dimensión Tecnológica', O: 'Dimensión Organizacional', E: 'Dimensión Económica' }

  return (
    <div style={{ marginBottom: 20 }}>
      <button
        onClick={() => setOpen(!open)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', background: ds.bg, border: `1.5px solid ${ds.border}`, borderRadius: 10, cursor: 'pointer', marginBottom: open ? 10 : 0 }}
        onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.9' }}
        onMouseLeave={(e) => { e.currentTarget.style.opacity = '1' }}
      >
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: ds.dot, flexShrink: 0 }} />
        <span style={{ fontSize: 14, fontWeight: 600, color: ds.color, flex: 1, textAlign: 'left' }}>{DIM_LABEL[dim.codigo] ?? dim.nombre}</span>
        <span style={{ fontSize: 12, color: ds.color, opacity: 0.7 }}>{dim.factores.length} factores · {sfTotal} subfactores{sfIa > 0 ? ` · ${sfIa} IA` : ''}</span>
        <span style={{ fontSize: 14, color: ds.color, transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }}>›</span>
      </button>
      {open && (
        <div style={{ paddingLeft: 4 }}>
          {dim.factores.map((f) => {
            const factorObs = obsReports.filter((r) => r.factor_codigo === f.codigo)
            return <FactorCard key={f.id} factor={f} dimCode={dim.codigo} isAdmin={isAdmin} obsReports={factorObs} />
          })}
        </div>
      )}
    </div>
  )
}

// ── CatalogoView ─────────────────────────────────────────────────────────────

export function CatalogoView() {
  const { user } = useAuthStore()
  const isAdmin = user?.rol === 'Admin'
  const [tab, setTab] = useState<'factores' | 'propuestas' | 'obsolescencia'>('factores')
  const [expandedJustif, setExpandedJustif] = useState<Set<number>>(new Set())
  const [generando, setGenerando] = useState(false)
  const [genMsg, setGenMsg] = useState('')
  const [genError, setGenError] = useState('')
  const [obsGenerando, setObsGenerando] = useState(false)
  const [obsMsg, setObsMsg] = useState('')
  const [obsError, setObsError] = useState('')
  const qc = useQueryClient()

  const { data: dims, isLoading } = useQuery({
    queryKey: ['catalogo'],
    queryFn: evaluacionesApi.catalogo,
    staleTime: 5 * 60 * 1000,
  })

  const { data: proposals = [], isLoading: propLoading, refetch: refetchProp } = useQuery({
    queryKey: ['ia-proposals'],
    queryFn: evaluacionesApi.proposals,
    enabled: isAdmin && tab === 'propuestas',
  })

  const { data: obsReports = [], isLoading: obsLoading, refetch: refetchObs } = useQuery({
    queryKey: ['ia-obsolescence'],
    queryFn: evaluacionesApi.obsolescenceReports,
    enabled: isAdmin,
  })

  const reviewMutation = useMutation({
    mutationFn: ({ id, accion, motivo }: { id: number; accion: 'aprobar' | 'rechazar'; motivo?: string }) =>
      evaluacionesApi.proposalReview(id, accion, motivo),
    onSuccess: () => { refetchProp(); qc.invalidateQueries({ queryKey: ['catalogo'] }) },
  })

  const obsReviewMutation = useMutation({
    mutationFn: ({ id, accion, marcarInactivo, motivo }: { id: number; accion: 'confirmar' | 'desestimar'; marcarInactivo: boolean; motivo?: string }) =>
      evaluacionesApi.obsolescenceReview(id, accion, marcarInactivo, motivo),
    onSuccess: () => { refetchObs(); qc.invalidateQueries({ queryKey: ['catalogo'] }) },
  })

  const pendingCount = proposals.filter((p) => p.estado === 'pendiente').length
  const pendingObs = obsReports.filter((r) => r.estado === 'pendiente').length

  const totalFactores = dims?.reduce((acc, d) => acc + d.factores.length, 0) ?? 0
  const totalSf = dims?.reduce((acc, d) => acc + d.factores.reduce((a, f) => a + f.subfactores.length, 0), 0) ?? 0
  const totalIa = dims?.reduce((acc, d) => acc + d.factores.reduce((a, f) => a + f.subfactores.filter((s) => s.origen === 'ia').length, 0), 0) ?? 0

  const handleGenerar = async () => {
    setGenerando(true); setGenMsg(''); setGenError('')
    try {
      const res = await evaluacionesApi.generarPropuestas(undefined, 2)
      setGenMsg(res.detail)
      setTimeout(() => refetchProp(), 8000)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setGenError(msg ?? 'Error al iniciar la generación. Verifica la configuración del servidor.')
    } finally { setGenerando(false) }
  }

  const handleGenerarObs = async () => {
    setObsGenerando(true); setObsMsg(''); setObsError('')
    try {
      const res = await evaluacionesApi.generateObsolescence()
      setObsMsg(res.detail)
      setTimeout(() => refetchObs(), 15000)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setObsError(msg ?? 'Error al iniciar el análisis. Verifica la configuración del servidor.')
    } finally { setObsGenerando(false) }
  }

  const TAB = (active: boolean): React.CSSProperties => ({
    padding: '8px 16px', fontSize: 13.5, fontWeight: active ? 600 : 450,
    color: active ? 'var(--dark)' : 'var(--gray2)',
    background: 'none', border: 'none',
    borderBottom: active ? '2px solid var(--light)' : '2px solid transparent',
    cursor: 'pointer', transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: 6,
  })

  const Badge = ({ n, color = '#e67e22' }: { n: number; color?: string }) => n > 0 ? (
    <span style={{ fontSize: 10, fontWeight: 700, background: color, color: '#fff', borderRadius: 99, padding: '1px 6px', minWidth: 18, textAlign: 'center' }}>{n}</span>
  ) : null

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14, marginBottom: 18, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ fontFamily: '"DM Sans", sans-serif', fontSize: 22, fontWeight: 700, color: 'var(--dark)', marginBottom: 3 }}>
            Catálogo GUIOS
          </h2>
          <p style={{ color: 'var(--gray2)', fontSize: 13 }}>
            18 factores · 61+ subfactores · 3 dimensiones — Rea Sánchez, Universidad de Sevilla (2022)
          </p>
        </div>
        {isAdmin && tab === 'factores' && (
          <button
            onClick={handleGenerar} disabled={generando}
            style={{ display: 'flex', alignItems: 'center', gap: 8, background: generando ? 'var(--mid)' : 'var(--dark)', color: 'var(--white)', border: 'none', borderRadius: 8, padding: '10px 18px', fontSize: 13.5, fontWeight: 500, cursor: generando ? 'not-allowed' : 'pointer', opacity: generando ? 0.7 : 1, flexShrink: 0 }}
            onMouseEnter={(e) => { if (!generando) e.currentTarget.style.background = 'var(--mid)' }}
            onMouseLeave={(e) => { if (!generando) e.currentTarget.style.background = 'var(--dark)' }}
          >
            <span style={{ fontSize: 15 }}>⊕</span>
            {generando ? 'Generando...' : 'Generar propuestas IA'}
          </button>
        )}
        {isAdmin && tab === 'obsolescencia' && (
          <button
            onClick={handleGenerarObs} disabled={obsGenerando}
            style={{ display: 'flex', alignItems: 'center', gap: 8, background: obsGenerando ? 'var(--mid)' : '#7d3c98', color: 'var(--white)', border: 'none', borderRadius: 8, padding: '10px 18px', fontSize: 13.5, fontWeight: 500, cursor: obsGenerando ? 'not-allowed' : 'pointer', opacity: obsGenerando ? 0.7 : 1, flexShrink: 0 }}
            onMouseEnter={(e) => { if (!obsGenerando) e.currentTarget.style.background = '#6c3483' }}
            onMouseLeave={(e) => { if (!obsGenerando) e.currentTarget.style.background = '#7d3c98' }}
          >
            <span style={{ fontSize: 14 }}>⚑</span>
            {obsGenerando ? 'Analizando...' : 'Detectar obsoletos con IA'}
          </button>
        )}
      </div>

      {/* Banners */}
      {genMsg && <div style={{ background: '#ebf5fb', border: '1px solid #aed6f1', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 13, color: 'var(--blue)', display: 'flex', gap: 8 }}>ℹ {genMsg}</div>}
      {genError && <div style={{ background: '#f9ebea', border: '1px solid #e59866', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 13, color: 'var(--red)', display: 'flex', gap: 8 }}>✕ {genError}</div>}
      {obsMsg && <div style={{ background: '#f5eef8', border: '1px solid #d2b4de', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 13, color: '#6c3483', display: 'flex', gap: 8 }}>ℹ {obsMsg}</div>}
      {obsError && <div style={{ background: '#f9ebea', border: '1px solid #e59866', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 13, color: 'var(--red)', display: 'flex', gap: 8 }}>✕ {obsError}</div>}

      {/* Stats */}
      {!isLoading && dims && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
          {[
            { label: 'Dimensiones', value: dims.length },
            { label: 'Factores', value: totalFactores },
            { label: 'Subfactores base', value: totalSf - totalIa },
            { label: 'Subfactores IA', value: totalIa },
          ].map((s) => (
            <div key={s.label} style={{ background: 'var(--white)', border: '1px solid rgba(0,0,0,0.07)', borderRadius: 'var(--radius)', padding: '14px 18px', boxShadow: 'var(--shadow)' }}>
              <div style={{ fontSize: 24, fontFamily: '"DM Mono", monospace', fontWeight: 700, color: 'var(--dark)' }}>{s.value}</div>
              <div style={{ fontSize: 11.5, color: 'var(--gray2)', marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      {isAdmin && (
        <div style={{ display: 'flex', borderBottom: '1px solid #eaecee', marginBottom: 20, gap: 2 }}>
          <button style={TAB(tab === 'factores')} onClick={() => setTab('factores')}>
            Factores y subfactores
          </button>
          <button style={TAB(tab === 'propuestas')} onClick={() => setTab('propuestas')}>
            Propuestas IA
            <Badge n={pendingCount} />
          </button>
          <button style={TAB(tab === 'obsolescencia')} onClick={() => setTab('obsolescencia')}>
            Obsolescencia IA
            <Badge n={pendingObs} color="#922b21" />
          </button>
        </div>
      )}

      {/* ── Tab: Factores ── */}
      {tab === 'factores' && (
        <>
          {isAdmin && (
            <div style={{ background: '#f5eef8', border: '1.5px solid #d2b4de', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 12.5, color: '#6c3483', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <span style={{ flexShrink: 0 }}>✎</span>
              <span>Modo edición activo — haz clic en el icono <strong>✎</strong> junto a cualquier subfactor para editar su nombre, descripción o estado activo/inactivo.</span>
            </div>
          )}
          <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 18, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11.5, color: 'var(--gray2)', fontWeight: 600 }}>LEYENDA:</span>
            {[
              { label: 'IS=1 Bajo', bg: '#f9ebea', color: '#922b21' },
              { label: 'IS=2 Medio', bg: '#fef9e7', color: '#7d6608' },
              { label: 'IS=3 Alto', bg: '#ebf5fb', color: '#154360' },
              { label: 'IS=4 Crítico', bg: '#eafaf1', color: '#1a5e31' },
              { label: 'Interno', bg: '#f5eef8', color: '#6c3483' },
              { label: 'Externo', bg: '#e8f8f5', color: '#0e6655' },
              { label: '★ Dual', bg: '#fdf2e9', color: '#784212' },
            ].map((l) => (
              <span key={l.label} style={{ fontSize: 10.5, fontWeight: 600, padding: '2px 9px', borderRadius: 99, background: l.bg, color: l.color }}>{l.label}</span>
            ))}
            <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 99, background: '#e8f8f5', color: '#0e6655', border: '1px solid #a2d9ce' }}>IA 2020-2026</span>
            <span style={{ fontSize: 10.5, color: 'var(--gray3)', marginLeft: 4 }}>= Aprobado por administrador</span>
          </div>

          {isLoading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[1, 2, 3].map((i) => <div key={i} style={{ height: 56, borderRadius: 10, background: '#eaecee', animation: 'pulse 1.5s ease-in-out infinite' }} />)}
            </div>
          )}

          {dims?.map((dim) => (
            <DimensionSection key={dim.id} dim={dim} isAdmin={isAdmin} obsReports={obsReports} />
          ))}

          {!isLoading && (
            <div style={{ marginTop: 24, padding: '14px 18px', background: '#fafbfc', border: '1px solid #eaecee', borderRadius: 10 }}>
              <p style={{ fontSize: 11.5, color: 'var(--gray2)', lineHeight: 1.6 }}>
                <strong>IS (Importancia Sugerida)</strong> = Matrix(IE, IL) — Figura 5.10, Rea Sánchez (2022).
                Los subfactores con <strong>IR=1</strong> se excluyen automáticamente de cada evaluación.
              </p>
            </div>
          )}
        </>
      )}

      {/* ── Tab: Propuestas IA ── */}
      {tab === 'propuestas' && isAdmin && (
        <div>
          <p style={{ fontSize: 13, color: 'var(--gray2)', lineHeight: 1.6, marginBottom: 16 }}>
            Subfactores propuestos por Claude basados en literatura científica 2020-2026. Requieren aprobación antes de incorporarse al catálogo.
          </p>
          <div style={{ background: 'var(--white)', border: '1px solid rgba(0,0,0,0.07)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)', overflow: 'hidden' }}>
            {propLoading ? (
              <div style={{ padding: 32, textAlign: 'center', color: 'var(--gray2)', fontSize: 13 }}>Cargando propuestas...</div>
            ) : proposals.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--gray2)', fontSize: 13 }}>
                No hay propuestas. Usa el botón <strong>Generar propuestas IA</strong> para crearlas.
              </div>
            ) : (
              proposals.map((p: SubfactorProposal) => {
                const estadoStyle: Record<string, { bg: string; color: string }> = {
                  pendiente: { bg: '#fef9e7', color: 'var(--orange)' },
                  aprobado: { bg: '#eafaf1', color: 'var(--green)' },
                  rechazado: { bg: '#f9ebea', color: 'var(--red)' },
                  en_revision: { bg: '#ebf5fb', color: 'var(--blue)' },
                }
                const st = estadoStyle[p.estado] ?? estadoStyle.pendiente
                const conf = confBadge(p.confianza_llm)
                const justifExpanded = expandedJustif.has(p.id)
                const justifLong = p.justificacion.length > 220
                return (
                  <div key={p.id} style={{ padding: '18px 20px', borderBottom: '1px solid #f5f6f7' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
                      <div style={{ flex: 1, minWidth: 280 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 10.5, fontFamily: '"DM Mono", monospace', background: '#f2f3f4', color: 'var(--gray2)', padding: '2px 7px', borderRadius: 5 }}>{p.factor_codigo}</span>
                          <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 9px', borderRadius: 20, background: st.bg, color: st.color }}>{p.estado}</span>
                        </div>
                        <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--dark)', lineHeight: 1.45, margin: '0 0 6px' }}>{p.texto}</p>
                        <p style={{ fontSize: 12.5, color: 'var(--gray2)', lineHeight: 1.6, margin: '0 0 4px' }}>
                          {justifExpanded || !justifLong ? p.justificacion : p.justificacion.slice(0, 220) + '…'}
                        </p>
                        {justifLong && (
                          <button
                            onClick={() => {
                              const next = new Set(expandedJustif)
                              justifExpanded ? next.delete(p.id) : next.add(p.id)
                              setExpandedJustif(next)
                            }}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--light)', fontWeight: 500, padding: '0 0 8px' }}
                          >
                            {justifExpanded ? '▲ Mostrar menos' : '▼ Leer justificación completa'}
                          </button>
                        )}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', fontSize: 11.5, color: 'var(--gray2)', marginTop: 4 }}>
                          <span style={{ fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: conf.bg, color: conf.color, border: `1px solid ${conf.border}` }}>
                            {Math.round(p.confianza_llm * 100)}% · {conf.label}
                          </span>
                          <span style={{ color: '#d5d8dc' }}>|</span>
                          <span>Factor: <strong style={{ color: 'var(--dark)' }}>{p.factor_nombre}</strong></span>
                          {p.factor_is !== undefined && <><span style={{ color: '#d5d8dc' }}>|</span><span>IL: {p.factor_is}</span></>}
                          {p.papers_count > 0 && <><span style={{ color: '#d5d8dc' }}>|</span><span>{p.papers_count} papers</span></>}
                        </div>
                      </div>
                      {p.estado === 'pendiente' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
                          <button onClick={() => reviewMutation.mutate({ id: p.id, accion: 'aprobar' })} disabled={reviewMutation.isPending} style={{ padding: '7px 16px', fontSize: 12.5, fontWeight: 600, borderRadius: 8, border: '1.5px solid #a9dfbf', background: '#eafaf1', color: '#1e8449', cursor: 'pointer' }} onMouseEnter={(e) => { e.currentTarget.style.background = '#d5f5e3' }} onMouseLeave={(e) => { e.currentTarget.style.background = '#eafaf1' }}>✓ Aprobar</button>
                          <button onClick={() => reviewMutation.mutate({ id: p.id, accion: 'rechazar' })} disabled={reviewMutation.isPending} style={{ padding: '7px 16px', fontSize: 12.5, fontWeight: 600, borderRadius: 8, border: '1.5px solid #f5b7b1', background: '#f9ebea', color: '#c0392b', cursor: 'pointer' }} onMouseEnter={(e) => { e.currentTarget.style.background = '#f2d7d5' }} onMouseLeave={(e) => { e.currentTarget.style.background = '#f9ebea' }}>✕ Rechazar</button>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}

      {/* ── Tab: Obsolescencia IA ── */}
      {tab === 'obsolescencia' && isAdmin && (
        <div>
          <p style={{ fontSize: 13, color: 'var(--gray2)', lineHeight: 1.6, marginBottom: 16 }}>
            Subfactores del catálogo que la IA considera potencialmente obsoletos basándose en literatura 2020-2026.
            Revisa cada reporte y decide si confirmar la obsolescencia (desactivar el subfactor) o descartarla.
          </p>

          <div style={{ background: 'var(--white)', border: '1px solid rgba(0,0,0,0.07)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)', overflow: 'hidden' }}>
            {obsLoading ? (
              <div style={{ padding: 32, textAlign: 'center', color: 'var(--gray2)', fontSize: 13 }}>Cargando análisis...</div>
            ) : obsReports.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--gray2)', fontSize: 13 }}>
                No hay reportes de obsolescencia. Usa <strong>Detectar obsoletos con IA</strong> para iniciar el análisis.
              </div>
            ) : (
              obsReports.map((r: SubfactorObsolescenceReport) => {
                const obs = obsBadge(r.confianza)
                const estadoStyle: Record<string, { bg: string; color: string }> = {
                  pendiente: { bg: '#fef9e7', color: 'var(--orange)' },
                  obsoleto: { bg: '#f9ebea', color: 'var(--red)' },
                  vigente: { bg: '#eafaf1', color: 'var(--green)' },
                }
                const st = estadoStyle[r.estado] ?? estadoStyle.pendiente
                return (
                  <div key={r.id} style={{ padding: '18px 20px', borderBottom: '1px solid #f5f6f7' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
                      <div style={{ flex: 1, minWidth: 280 }}>
                        {/* Metadata row */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 10.5, fontFamily: '"DM Mono", monospace', background: '#f2f3f4', color: 'var(--gray2)', padding: '2px 7px', borderRadius: 5 }}>{r.subfactor_codigo}</span>
                          <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 9px', borderRadius: 20, background: st.bg, color: st.color }}>{r.estado}</span>
                          {r.subfactor_origen === 'ia' && <IaBadge />}
                          {!r.subfactor_activo && <span style={{ fontSize: 10, color: 'var(--gray3)', background: '#f2f3f4', padding: '1px 6px', borderRadius: 99 }}>inactivo</span>}
                        </div>

                        {/* Subfactor name */}
                        <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--dark)', lineHeight: 1.45, margin: '0 0 4px' }}>{r.subfactor_nombre}</p>

                        {/* Justification */}
                        <p style={{ fontSize: 12.5, color: 'var(--gray2)', lineHeight: 1.6, margin: '0 0 8px' }}>{r.justificacion}</p>

                        {/* Confidence + metadata */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', fontSize: 11.5, color: 'var(--gray2)' }}>
                          <span style={{ fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: obs.bg, color: obs.color, border: `1px solid ${obs.border}` }}>
                            {Math.round(r.confianza * 100)}% obsolescencia · {obs.label}
                          </span>
                          <span style={{ color: '#d5d8dc' }}>|</span>
                          <span>Factor: <strong style={{ color: 'var(--dark)' }}>{r.factor_nombre}</strong></span>
                          <span style={{ color: '#d5d8dc' }}>|</span>
                          <span style={{ fontSize: 10.5, background: DIM_STYLE[r.dimension_codigo]?.bg ?? '#f2f3f4', color: DIM_STYLE[r.dimension_codigo]?.color ?? 'var(--gray2)', padding: '1px 7px', borderRadius: 6, fontWeight: 600 }}>{r.dimension_codigo}</span>
                          {r.papers_count > 0 && <><span style={{ color: '#d5d8dc' }}>|</span><span>{r.papers_count} papers</span></>}
                        </div>

                        {r.motivo_decision && (
                          <div style={{ marginTop: 8, fontSize: 11.5, color: 'var(--gray2)', fontStyle: 'italic', background: '#fafbfc', borderRadius: 6, padding: '6px 10px', border: '1px solid #eaecee' }}>
                            Decisión: {r.motivo_decision}
                          </div>
                        )}
                      </div>

                      {/* Action buttons */}
                      {r.estado === 'pendiente' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
                          <button
                            onClick={() => obsReviewMutation.mutate({ id: r.id, accion: 'confirmar', marcarInactivo: true })}
                            disabled={obsReviewMutation.isPending}
                            style={{ padding: '7px 14px', fontSize: 12, fontWeight: 600, borderRadius: 8, border: '1.5px solid #f5b7b1', background: '#f9ebea', color: '#c0392b', cursor: 'pointer', whiteSpace: 'nowrap' }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = '#f2d7d5' }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = '#f9ebea' }}
                          >
                            Confirmar obsoleto
                          </button>
                          <button
                            onClick={() => obsReviewMutation.mutate({ id: r.id, accion: 'confirmar', marcarInactivo: false })}
                            disabled={obsReviewMutation.isPending}
                            style={{ padding: '7px 14px', fontSize: 12, fontWeight: 600, borderRadius: 8, border: '1.5px solid #f9e79f', background: '#fef9e7', color: '#9a7d0a', cursor: 'pointer', whiteSpace: 'nowrap' }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = '#fef3cf' }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = '#fef9e7' }}
                          >
                            Marcar obsoleto (mantener activo)
                          </button>
                          <button
                            onClick={() => obsReviewMutation.mutate({ id: r.id, accion: 'desestimar', marcarInactivo: false })}
                            disabled={obsReviewMutation.isPending}
                            style={{ padding: '7px 14px', fontSize: 12, fontWeight: 600, borderRadius: 8, border: '1.5px solid #a9dfbf', background: '#eafaf1', color: '#1e8449', cursor: 'pointer', whiteSpace: 'nowrap' }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = '#d5f5e3' }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = '#eafaf1' }}
                          >
                            ✓ Sigue vigente
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
