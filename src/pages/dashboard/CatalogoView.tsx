import { useState, useEffect, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  evaluacionesApi,
  type Dimension, type Factor, type SubfactorProposal,
  type SubfactorObsolescenceReport, type Subfactor,
} from '@/api/evaluaciones'
import { useAuthStore } from '@/store/authStore'
import { useIsMobile as _useIsMobile } from '@/lib/useMediaQuery'

const DIM_STYLE: Record<string, { bg: string; color: string; border: string; dot: string }> = {
  T: { bg: '#ebf5fb', color: '#1a5276', border: '#aed6f1', dot: '#2980b9' },
  O: { bg: '#eafaf1', color: '#1e8449', border: '#a9dfbf', dot: '#27ae60' },
  E: { bg: '#fef9e7', color: '#b7770d', border: '#f9e79f', dot: '#d4ac0d' },
}

const DIM_LABEL: Record<string, string> = {
  T: 'Dimensión Tecnológica',
  O: 'Dimensión Organizacional',
  E: 'Dimensión Económica',
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
  sf, obsReport, isAdmin, onUpdated, onIaDeactivated,
}: {
  sf: Subfactor
  obsReport?: SubfactorObsolescenceReport
  isAdmin: boolean
  onUpdated: (updated: Subfactor) => void
  onIaDeactivated?: () => void
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
      qc.invalidateQueries({ queryKey: ['ia-proposals'] })
      onUpdated(updated)
      setEditing(false)
      // If an IA subfactor was deactivated, notify parent to switch to proposals tab
      if (sf.origen === 'ia' && updated.activo === false && sf.activo === true) {
        onIaDeactivated?.()
      }
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
          {sf.origen === 'ia' && activo === false && sf.activo === true && (
            <div style={{ background: '#fef9e7', border: '1px solid #f9e79f', borderRadius: 6, padding: '8px 10px', fontSize: 12, color: '#9a7d0a' }}>
              ⚠ Al desactivar este subfactor IA, volverá a la lista de <strong>Propuestas IA</strong> para poder reactivarlo cuando lo necesites.
            </div>
          )}
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
        {sf.origen === 'ia' && sf.activo && <IaBadge />}
        {sf.origen === 'ia' && !sf.activo && (
          <span style={{ fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 99, background: '#fef9e7', color: '#9a7d0a', border: '1px solid #f9e79f' }}>
            IA · en propuestas
          </span>
        )}
        {sf.origen !== 'ia' && !activo && (
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
  factor, dimCode, isAdmin, obsReports, onIaDeactivated,
}: {
  factor: Factor
  dimCode: string
  isAdmin: boolean
  obsReports: SubfactorObsolescenceReport[]
  onIaDeactivated?: () => void
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
  // Only count active IA subfactors in the badge
  const sfIaActivos = localSfs.filter((s) => s.origen === 'ia' && s.activo).length
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
            {sfTotal} SF{sfIaActivos > 0 ? ` · ${sfIaActivos} IA` : ''}{sfObs > 0 ? ` · ${sfObs} ⚠` : ''}
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
                onIaDeactivated={onIaDeactivated}
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
  dim, isAdmin, obsReports, onIaDeactivated,
}: {
  dim: Dimension
  isAdmin: boolean
  obsReports: SubfactorObsolescenceReport[]
  onIaDeactivated?: () => void
}) {
  const [open, setOpen] = useState(false)
  const ds = DIM_STYLE[dim.codigo] ?? DIM_STYLE['T']
  const sfTotal = dim.factores.reduce((acc, f) => acc + f.subfactores.length, 0)
  // Only active IA subfactors in the dimension header count
  const sfIaActivos = dim.factores.reduce((acc, f) => acc + f.subfactores.filter((s) => s.origen === 'ia' && s.activo).length, 0)

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
        <span style={{ fontSize: 12, color: ds.color, opacity: 0.7 }}>{dim.factores.length} factores · {sfTotal} subfactores{sfIaActivos > 0 ? ` · ${sfIaActivos} IA` : ''}</span>
        <span style={{ fontSize: 14, color: ds.color, transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }}>›</span>
      </button>
      {open && (
        <div style={{ paddingLeft: 4 }}>
          {dim.factores.map((f) => {
            const factorObs = obsReports.filter((r) => r.factor_codigo === f.codigo)
            return (
              <FactorCard
                key={f.id}
                factor={f}
                dimCode={dim.codigo}
                isAdmin={isAdmin}
                obsReports={factorObs}
                onIaDeactivated={onIaDeactivated}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── ProposalDimSection ── Grouped proposals for a single dimension ────────────

function ProposalDimSection({
  dimCode, factors, proposals, expandedJustif, onToggleJustif, reviewMutation,
  onGenerate, generating, onLimpiar, limpiando,
}: {
  dimCode: string
  factors: { factor_codigo: string; factor_nombre: string; factor_is: number; proposals: SubfactorProposal[] }[]
  proposals: SubfactorProposal[]
  expandedJustif: Set<number>
  onToggleJustif: (id: number) => void
  reviewMutation: { mutate: (v: { id: number; accion: 'aprobar' | 'rechazar'; motivo?: string }) => void; isPending: boolean }
  onGenerate?: () => void
  generating?: boolean
  onLimpiar?: () => void
  limpiando?: boolean
}) {
  const ds = DIM_STYLE[dimCode] ?? DIM_STYLE['T']
  const [open, setOpen] = useState(false)
  const [rechazandoId, setRechazandoId] = useState<number | null>(null)
  const [motivoText, setMotivoText] = useState('')
  const pendingInDim = proposals.filter((p) => p.estado === 'pendiente').length
  const totalInDim = proposals.length

  return (
    <div style={{ marginBottom: 16 }}>
      {/* Header row: toggle + per-dim generate button as siblings (no nested buttons) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: open ? 8 : 0 }}>
        <button
          onClick={() => setOpen(!open)}
          style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: ds.bg, border: `1.5px solid ${ds.border}`, borderRadius: 10, cursor: 'pointer' }}
          onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.9' }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = '1' }}
        >
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: ds.dot, flexShrink: 0 }} />
          <span style={{ fontSize: 13.5, fontWeight: 600, color: ds.color, flex: 1, textAlign: 'left' }}>{DIM_LABEL[dimCode] ?? dimCode}</span>
          <span style={{ fontSize: 11.5, color: ds.color, opacity: 0.7 }}>
            {factors.length} factores{totalInDim > 0 ? ` · ${totalInDim} propuesta${totalInDim > 1 ? 's' : ''}` : ''}
          </span>
          {pendingInDim > 0 && (
            <span style={{ fontSize: 10.5, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: '#e67e22', color: '#fff' }}>{pendingInDim} pendiente{pendingInDim > 1 ? 's' : ''}</span>
          )}
          <span style={{ fontSize: 13, color: ds.color, transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }}>›</span>
        </button>
        {onGenerate && (
          <button
            onClick={onGenerate}
            disabled={generating}
            title={`Generar propuestas IA solo para la ${DIM_LABEL[dimCode] ?? dimCode}`}
            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '9px 13px', fontSize: 12, fontWeight: 600, borderRadius: 9, border: `1.5px solid ${ds.border}`, background: ds.bg, color: ds.color, cursor: generating ? 'not-allowed' : 'pointer', opacity: generating ? 0.6 : 1, whiteSpace: 'nowrap', flexShrink: 0 }}
            onMouseEnter={(e) => { if (!generating) e.currentTarget.style.opacity = '0.8' }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = generating ? '0.6' : '1' }}
          >
            <span style={{ fontSize: 13 }}>⊕</span>
            {generating ? 'Generando...' : 'Generar'}
          </button>
        )}
        {onLimpiar && pendingInDim > 0 && (
          <button
            onClick={onLimpiar}
            disabled={limpiando}
            title={`Eliminar ${pendingInDim} propuesta(s) pendiente(s) de esta dimensión`}
            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '9px 13px', fontSize: 12, fontWeight: 600, borderRadius: 9, border: '1.5px solid #f0b27a', background: '#fef5e7', color: '#ca6f1e', cursor: limpiando ? 'not-allowed' : 'pointer', opacity: limpiando ? 0.6 : 1, whiteSpace: 'nowrap', flexShrink: 0 }}
            onMouseEnter={(e) => { if (!limpiando) e.currentTarget.style.opacity = '0.8' }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = limpiando ? '0.6' : '1' }}
          >
            ↺ {limpiando ? 'Limpiando...' : 'Limpiar'}
          </button>
        )}
      </div>

      {open && (
        <div style={{ paddingLeft: 4, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {factors.map(({ factor_codigo, factor_nombre, factor_is, proposals: fps }) => {
            const ds2 = DIM_STYLE[dimCode] ?? DIM_STYLE['T']
            const is = IS_STYLE[factor_is] ?? IS_STYLE[3]
            const pendingInFactor = fps.filter((p) => p.estado === 'pendiente').length
            return (
              <div key={factor_codigo} style={{ border: '1px solid #eaecee', borderRadius: 10, overflow: 'hidden', background: 'var(--white)' }}>
                {/* Factor header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', background: '#fafbfc', borderBottom: '1px solid #f2f3f4' }}>
                  <span style={{ fontSize: 10, fontFamily: '"DM Mono", monospace', fontWeight: 600, background: ds2.bg, color: ds2.color, padding: '2px 7px', borderRadius: 6, border: `1px solid ${ds2.border}`, flexShrink: 0 }}>
                    {factor_codigo}
                  </span>
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: 'var(--dark)' }}>{factor_nombre}</span>
                  <span style={{ fontSize: 10.5, fontWeight: 600, padding: '2px 8px', borderRadius: 99, background: is.bg, color: is.color }}>{is.label}</span>
                  {pendingInFactor > 0 && (
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 99, background: '#e67e22', color: '#fff' }}>{pendingInFactor}</span>
                  )}
                </div>
                {/* Proposals within this factor — or empty state */}
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {fps.length === 0 && (
                    <div style={{ padding: '10px 16px', fontSize: 12, color: 'var(--gray3)', fontStyle: 'italic' }}>
                      Sin propuestas generadas para este factor
                    </div>
                  )}
                  {fps.map((p) => {
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
                    const isRetornada = p.estado === 'pendiente' && p.subfactor_creado_codigo !== null

                    return (
                      <div key={p.id} style={{ padding: '14px 16px', borderBottom: '1px solid #f5f6f7', display: 'flex', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap' }}>
                        <div style={{ flex: 1, minWidth: 260 }}>
                          {/* State badges row */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 9px', borderRadius: 20, background: st.bg, color: st.color }}>{p.estado}</span>
                            {isRetornada && (
                              <span style={{ fontSize: 10.5, fontWeight: 700, padding: '1px 7px', borderRadius: 99, background: '#fef9e7', color: '#9a7d0a', border: '1px solid #f9e79f' }}>
                                ↩ Retornada — código {p.subfactor_creado_codigo}
                              </span>
                            )}
                          </div>
                          {/* Proposal text */}
                          <p style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--dark)', lineHeight: 1.45, margin: '0 0 6px' }}>{p.texto}</p>
                          {/* Justification */}
                          <p style={{ fontSize: 12.5, color: 'var(--gray2)', lineHeight: 1.6, margin: '0 0 4px' }}>
                            {justifExpanded || !justifLong ? p.justificacion : p.justificacion.slice(0, 220) + '…'}
                          </p>
                          {justifLong && (
                            <button
                              onClick={() => onToggleJustif(p.id)}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--light)', fontWeight: 500, padding: '0 0 6px' }}
                            >
                              {justifExpanded ? '▲ Mostrar menos' : '▼ Leer justificación completa'}
                            </button>
                          )}
                          {/* Metadata */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', fontSize: 11.5, color: 'var(--gray2)', marginTop: 4 }}>
                            <span style={{ fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: conf.bg, color: conf.color, border: `1px solid ${conf.border}` }}>
                              {Math.round(p.confianza_llm * 100)}% confianza · {conf.label}
                            </span>
                            {p.papers_count > 0 && <><span style={{ color: '#d5d8dc' }}>|</span><span>{p.papers_count} papers</span></>}
                            {p.motivo_decision && (
                              <span style={{ fontStyle: 'italic', color: 'var(--gray3)' }}>Decisión: {p.motivo_decision}</span>
                            )}
                          </div>
                        </div>
                        {/* Action buttons — only for pending proposals */}
                        {p.estado === 'pendiente' && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0, minWidth: 148 }}>
                            <button
                              onClick={() => reviewMutation.mutate({ id: p.id, accion: 'aprobar' })}
                              disabled={reviewMutation.isPending}
                              style={{ padding: '7px 16px', fontSize: 12.5, fontWeight: 600, borderRadius: 8, border: '1.5px solid #a9dfbf', background: '#eafaf1', color: '#1e8449', cursor: 'pointer', whiteSpace: 'nowrap' }}
                              onMouseEnter={(e) => { e.currentTarget.style.background = '#d5f5e3' }}
                              onMouseLeave={(e) => { e.currentTarget.style.background = '#eafaf1' }}
                            >
                              {isRetornada ? '↩ Reactivar en catálogo' : '✓ Aprobar'}
                            </button>
                            {rechazandoId === p.id ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                                <textarea
                                  value={motivoText}
                                  onChange={(e) => setMotivoText(e.target.value)}
                                  placeholder="Motivo del rechazo (opcional)"
                                  rows={2}
                                  style={{ fontSize: 12, borderRadius: 6, border: '1.5px solid #d5d8dc', padding: '5px 8px', resize: 'vertical', outline: 'none', width: '100%', boxSizing: 'border-box' }}
                                  onFocus={(e) => { e.target.style.borderColor = 'var(--light)' }}
                                  onBlur={(e) => { e.target.style.borderColor = '#d5d8dc' }}
                                />
                                <div style={{ display: 'flex', gap: 5 }}>
                                  <button
                                    onClick={() => { reviewMutation.mutate({ id: p.id, accion: 'rechazar', motivo: motivoText.trim() || undefined }); setRechazandoId(null); setMotivoText('') }}
                                    disabled={reviewMutation.isPending}
                                    style={{ flex: 1, padding: '6px 10px', fontSize: 12, fontWeight: 600, borderRadius: 7, border: '1.5px solid #f5b7b1', background: '#f9ebea', color: '#c0392b', cursor: 'pointer' }}
                                    onMouseEnter={(e) => { e.currentTarget.style.background = '#f2d7d5' }}
                                    onMouseLeave={(e) => { e.currentTarget.style.background = '#f9ebea' }}
                                  >
                                    Confirmar
                                  </button>
                                  <button
                                    onClick={() => { setRechazandoId(null); setMotivoText('') }}
                                    style={{ padding: '6px 10px', fontSize: 12, fontWeight: 500, borderRadius: 7, border: '1.5px solid #d5d8dc', background: 'var(--white)', color: 'var(--gray2)', cursor: 'pointer' }}
                                    onMouseEnter={(e) => { e.currentTarget.style.background = '#f2f3f4' }}
                                    onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--white)' }}
                                  >
                                    Cancelar
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <button
                                onClick={() => { setRechazandoId(p.id); setMotivoText('') }}
                                disabled={reviewMutation.isPending}
                                style={{ padding: '7px 16px', fontSize: 12.5, fontWeight: 600, borderRadius: 8, border: '1.5px solid #f5b7b1', background: '#f9ebea', color: '#c0392b', cursor: 'pointer', whiteSpace: 'nowrap' }}
                                onMouseEnter={(e) => { e.currentTarget.style.background = '#f2d7d5' }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = '#f9ebea' }}
                              >
                                ✕ Rechazar
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── ObsDimSection ── Grouped obsolescence reports for a single dimension ──────

function ObsDimSection({
  dimCode, factors, obsReviewMutation, deactivateMutation,
  onGenerateObs, generatingObs, onLimpiarObs, limpiandoObs,
}: {
  dimCode: string
  factors: { factor_codigo: string; factor_nombre: string; factor_is: number; reports: SubfactorObsolescenceReport[] }[]
  obsReviewMutation: { mutate: (v: { id: number; accion: 'confirmar' | 'desestimar'; marcarInactivo: boolean; motivo?: string }) => void; isPending: boolean }
  deactivateMutation: { mutate: (subfactorId: number) => void; isPending: boolean }
  onGenerateObs?: () => void
  generatingObs?: boolean
  onLimpiarObs?: () => void
  limpiandoObs?: boolean
}) {
  const ds = DIM_STYLE[dimCode] ?? DIM_STYLE['T']
  const [open, setOpen] = useState(false)
  const [expandedJustif, setExpandedJustif] = useState<Set<number>>(new Set())
  const [confirmandoId, setConfirmandoId] = useState<number | null>(null)
  const [confirmAction, setConfirmAction] = useState<{ marcarInactivo: boolean } | null>(null)
  const [motivoText, setMotivoText] = useState('')

  const totalReports = factors.reduce((acc, f) => acc + f.reports.length, 0)
  const pendingInDim = factors.reduce((acc, f) => acc + f.reports.filter((r) => r.estado === 'pendiente').length, 0)
  const clearableInDim = factors.reduce((acc, f) => acc + f.reports.filter((r) => r.estado === 'pendiente' || r.estado === 'vigente').length, 0)

  const toggleJustif = (id: number) => {
    setExpandedJustif((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const startConfirm = (id: number, marcarInactivo: boolean) => {
    setConfirmandoId(id)
    setConfirmAction({ marcarInactivo })
    setMotivoText('')
  }

  const cancelConfirm = () => {
    setConfirmandoId(null)
    setConfirmAction(null)
    setMotivoText('')
  }

  const submitConfirm = (id: number) => {
    obsReviewMutation.mutate({
      id,
      accion: 'confirmar',
      marcarInactivo: confirmAction!.marcarInactivo,
      motivo: motivoText.trim() || undefined,
    })
    cancelConfirm()
  }

  return (
    <div style={{ marginBottom: 16 }}>
      {/* Header row: toggle + per-dim detect button as siblings */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: open ? 8 : 0 }}>
        <button
          onClick={() => setOpen(!open)}
          style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: ds.bg, border: `1.5px solid ${ds.border}`, borderRadius: 10, cursor: 'pointer' }}
          onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.9' }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = '1' }}
        >
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: ds.dot, flexShrink: 0 }} />
          <span style={{ fontSize: 13.5, fontWeight: 600, color: ds.color, flex: 1, textAlign: 'left' }}>{DIM_LABEL[dimCode] ?? dimCode}</span>
          <span style={{ fontSize: 11.5, color: ds.color, opacity: 0.7 }}>
            {factors.length} factores{totalReports > 0 ? ` · ${totalReports} analizado${totalReports > 1 ? 's' : ''}` : ''}
          </span>
          {pendingInDim > 0 && (
            <span style={{ fontSize: 10.5, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: '#922b21', color: '#fff' }}>{pendingInDim} pendiente{pendingInDim > 1 ? 's' : ''}</span>
          )}
          <span style={{ fontSize: 13, color: ds.color, transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }}>›</span>
        </button>
        {onGenerateObs && (
          <button
            onClick={onGenerateObs}
            disabled={generatingObs}
            title={`Detectar subfactores obsoletos solo en la ${DIM_LABEL[dimCode] ?? dimCode}`}
            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '9px 13px', fontSize: 12, fontWeight: 600, borderRadius: 9, border: '1.5px solid #d2b4de', background: '#f5eef8', color: '#7d3c98', cursor: generatingObs ? 'not-allowed' : 'pointer', opacity: generatingObs ? 0.6 : 1, whiteSpace: 'nowrap', flexShrink: 0 }}
            onMouseEnter={(e) => { if (!generatingObs) e.currentTarget.style.opacity = '0.8' }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = generatingObs ? '0.6' : '1' }}
          >
            <span style={{ fontSize: 13 }}>⚑</span>
            {generatingObs ? 'Analizando...' : 'Detectar'}
          </button>
        )}
        {onLimpiarObs && clearableInDim > 0 && (
          <button
            onClick={onLimpiarObs}
            disabled={limpiandoObs}
            title={`Eliminar ${clearableInDim} reporte(s) de esta dimensión`}
            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '9px 13px', fontSize: 12, fontWeight: 600, borderRadius: 9, border: '1.5px solid #f1948a', background: '#fdedec', color: '#922b21', cursor: limpiandoObs ? 'not-allowed' : 'pointer', opacity: limpiandoObs ? 0.6 : 1, whiteSpace: 'nowrap', flexShrink: 0 }}
            onMouseEnter={(e) => { if (!limpiandoObs) e.currentTarget.style.opacity = '0.8' }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = limpiandoObs ? '0.6' : '1' }}
          >
            ↺ {limpiandoObs ? 'Limpiando...' : 'Limpiar'}
          </button>
        )}
      </div>

      {open && (
        <div style={{ paddingLeft: 4, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {factors.map(({ factor_codigo, factor_nombre, factor_is, reports }) => {
            const ds2 = DIM_STYLE[dimCode] ?? DIM_STYLE['T']
            const is = IS_STYLE[factor_is] ?? IS_STYLE[3]
            const pendingInFactor = reports.filter((r) => r.estado === 'pendiente').length
            return (
              <div key={factor_codigo} style={{ border: '1px solid #eaecee', borderRadius: 10, overflow: 'hidden', background: 'var(--white)' }}>
                {/* Factor header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', background: '#fafbfc', borderBottom: '1px solid #f2f3f4' }}>
                  <span style={{ fontSize: 10, fontFamily: '"DM Mono", monospace', fontWeight: 600, background: ds2.bg, color: ds2.color, padding: '2px 7px', borderRadius: 6, border: `1px solid ${ds2.border}`, flexShrink: 0 }}>
                    {factor_codigo}
                  </span>
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: 'var(--dark)' }}>{factor_nombre}</span>
                  <span style={{ fontSize: 10.5, fontWeight: 600, padding: '2px 8px', borderRadius: 99, background: is.bg, color: is.color }}>{is.label}</span>
                  {pendingInFactor > 0 && (
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 99, background: '#922b21', color: '#fff' }}>{pendingInFactor}</span>
                  )}
                </div>

                {/* Obsolescence reports within this factor */}
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {reports.length === 0 && (
                    <div style={{ padding: '10px 16px', fontSize: 12, color: 'var(--gray3)', fontStyle: 'italic' }}>
                      Sin subfactores detectados como obsoletos en este factor
                    </div>
                  )}
                  {reports.map((r) => {
                    const obs = obsBadge(r.confianza)
                    const estadoStyle: Record<string, { bg: string; color: string }> = {
                      pendiente: { bg: '#fef9e7', color: 'var(--orange)' },
                      obsoleto:  { bg: '#f9ebea', color: 'var(--red)' },
                      vigente:   { bg: '#eafaf1', color: 'var(--green)' },
                    }
                    const st = estadoStyle[r.estado] ?? estadoStyle.pendiente
                    const justifExpanded = expandedJustif.has(r.id)
                    const justifLong = r.justificacion.length > 220
                    const isConfirming = confirmandoId === r.id

                    return (
                      <div key={r.id} style={{ padding: '14px 16px', borderBottom: '1px solid #f5f6f7', display: 'flex', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap' }}>
                        <div style={{ flex: 1, minWidth: 260 }}>
                          {/* Metadata row */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 10.5, fontFamily: '"DM Mono", monospace', background: '#f2f3f4', color: 'var(--gray2)', padding: '2px 7px', borderRadius: 5 }}>{r.subfactor_codigo}</span>
                            <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 9px', borderRadius: 20, background: st.bg, color: st.color }}>{r.estado}</span>
                            {r.subfactor_origen === 'ia' && <IaBadge />}
                            {!r.subfactor_activo && <span style={{ fontSize: 10, color: 'var(--gray3)', background: '#f2f3f4', padding: '1px 6px', borderRadius: 99 }}>inactivo</span>}
                          </div>
                          {/* Subfactor name */}
                          <p style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--dark)', lineHeight: 1.45, margin: '0 0 6px' }}>{r.subfactor_nombre}</p>
                          {/* Justification — expandable */}
                          <p style={{ fontSize: 12.5, color: 'var(--gray2)', lineHeight: 1.6, margin: '0 0 4px' }}>
                            {justifExpanded || !justifLong ? r.justificacion : r.justificacion.slice(0, 220) + '…'}
                          </p>
                          {justifLong && (
                            <button
                              onClick={() => toggleJustif(r.id)}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--light)', fontWeight: 500, padding: '0 0 6px' }}
                            >
                              {justifExpanded ? '▲ Mostrar menos' : '▼ Leer análisis completo'}
                            </button>
                          )}
                          {/* Confidence + metadata */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', fontSize: 11.5, color: 'var(--gray2)', marginTop: 4 }}>
                            <span style={{ fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: obs.bg, color: obs.color, border: `1px solid ${obs.border}` }}>
                              {Math.round(r.confianza * 100)}% obsolescencia · {obs.label}
                            </span>
                            {r.papers_count > 0 && <><span style={{ color: '#d5d8dc' }}>|</span><span>{r.papers_count} papers</span></>}
                          </div>
                          {r.motivo_decision && (
                            <div style={{ marginTop: 8, fontSize: 11.5, color: 'var(--gray2)', fontStyle: 'italic', background: '#fafbfc', borderRadius: 6, padding: '6px 10px', border: '1px solid #eaecee' }}>
                              Decisión: {r.motivo_decision}
                            </div>
                          )}
                        </div>

                        {/* ── Action buttons (pending) ── */}
                        {r.estado === 'pendiente' && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0, minWidth: 160 }}>
                            {isConfirming ? (
                              /* Two-step confirm with motivo — same pattern as rechazar in proposals */
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                                <div style={{ fontSize: 11, color: 'var(--gray2)', fontWeight: 600, marginBottom: 2 }}>
                                  {confirmAction?.marcarInactivo ? 'Confirmar obsoleto y desactivar' : 'Confirmar obsoleto (mantener activo)'}
                                </div>
                                <textarea
                                  value={motivoText}
                                  onChange={(e) => setMotivoText(e.target.value)}
                                  placeholder="Motivo de la decisión (opcional)"
                                  rows={2}
                                  style={{ fontSize: 12, borderRadius: 6, border: '1.5px solid #d5d8dc', padding: '5px 8px', resize: 'vertical', outline: 'none', width: '100%', boxSizing: 'border-box' }}
                                  onFocus={(e) => { e.target.style.borderColor = 'var(--light)' }}
                                  onBlur={(e) => { e.target.style.borderColor = '#d5d8dc' }}
                                />
                                <div style={{ display: 'flex', gap: 5 }}>
                                  <button
                                    onClick={() => submitConfirm(r.id)}
                                    disabled={obsReviewMutation.isPending}
                                    style={{ flex: 1, padding: '6px 10px', fontSize: 12, fontWeight: 600, borderRadius: 7, border: '1.5px solid #f5b7b1', background: '#f9ebea', color: '#c0392b', cursor: 'pointer' }}
                                    onMouseEnter={(e) => { e.currentTarget.style.background = '#f2d7d5' }}
                                    onMouseLeave={(e) => { e.currentTarget.style.background = '#f9ebea' }}
                                  >
                                    Confirmar
                                  </button>
                                  <button
                                    onClick={cancelConfirm}
                                    style={{ padding: '6px 10px', fontSize: 12, fontWeight: 500, borderRadius: 7, border: '1.5px solid #d5d8dc', background: 'var(--white)', color: 'var(--gray2)', cursor: 'pointer' }}
                                    onMouseEnter={(e) => { e.currentTarget.style.background = '#f2f3f4' }}
                                    onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--white)' }}
                                  >
                                    Cancelar
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <>
                                {/* 1. Positive action first */}
                                <button
                                  onClick={() => obsReviewMutation.mutate({ id: r.id, accion: 'desestimar', marcarInactivo: false })}
                                  disabled={obsReviewMutation.isPending}
                                  style={{ padding: '7px 14px', fontSize: 12.5, fontWeight: 600, borderRadius: 8, border: '1.5px solid #a9dfbf', background: '#eafaf1', color: '#1e8449', cursor: 'pointer', whiteSpace: 'nowrap' }}
                                  onMouseEnter={(e) => { e.currentTarget.style.background = '#d5f5e3' }}
                                  onMouseLeave={(e) => { e.currentTarget.style.background = '#eafaf1' }}
                                >
                                  ✓ Sigue vigente
                                </button>
                                {/* 2. Destructive — desactivar (most common action) */}
                                <button
                                  onClick={() => startConfirm(r.id, true)}
                                  disabled={obsReviewMutation.isPending}
                                  style={{ padding: '7px 14px', fontSize: 12.5, fontWeight: 600, borderRadius: 8, border: '1.5px solid #f5b7b1', background: '#f9ebea', color: '#c0392b', cursor: 'pointer', whiteSpace: 'nowrap' }}
                                  onMouseEnter={(e) => { e.currentTarget.style.background = '#f2d7d5' }}
                                  onMouseLeave={(e) => { e.currentTarget.style.background = '#f9ebea' }}
                                >
                                  ⊘ Obsoleto · desactivar
                                </button>
                                {/* 3. Soft confirm — marcar sin desactivar */}
                                <button
                                  onClick={() => startConfirm(r.id, false)}
                                  disabled={obsReviewMutation.isPending}
                                  style={{ padding: '6px 14px', fontSize: 12, fontWeight: 500, borderRadius: 8, border: '1.5px solid #f9e79f', background: '#fef9e7', color: '#9a7d0a', cursor: 'pointer', whiteSpace: 'nowrap' }}
                                  onMouseEnter={(e) => { e.currentTarget.style.background = '#fef3cf' }}
                                  onMouseLeave={(e) => { e.currentTarget.style.background = '#fef9e7' }}
                                >
                                  ⚠ Obsoleto (mantener activo)
                                </button>
                                {/* 4. Solo desactivar sin marcar obsoleto — smaller, secondary */}
                                {r.subfactor_activo && (
                                  <button
                                    onClick={() => deactivateMutation.mutate(r.subfactor_id)}
                                    disabled={deactivateMutation.isPending}
                                    style={{ padding: '5px 14px', fontSize: 11.5, fontWeight: 500, borderRadius: 8, border: '1.5px solid #d2b4de', background: '#f5eef8', color: '#7d3c98', cursor: 'pointer', whiteSpace: 'nowrap' }}
                                    onMouseEnter={(e) => { e.currentTarget.style.background = '#e8daef' }}
                                    onMouseLeave={(e) => { e.currentTarget.style.background = '#f5eef8' }}
                                  >
                                    Solo desactivar
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        )}

                        {/* ── Vigente (IA confirmed) — allow admin to override ── */}
                        {r.estado === 'vigente' && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0, minWidth: 160 }}>
                            <button
                              onClick={() => obsReviewMutation.mutate({ id: r.id, accion: 'confirmar', marcarInactivo: true })}
                              disabled={obsReviewMutation.isPending}
                              style={{ padding: '7px 14px', fontSize: 12.5, fontWeight: 600, borderRadius: 8, border: '1.5px solid #f5b7b1', background: '#f9ebea', color: '#c0392b', cursor: 'pointer', whiteSpace: 'nowrap' }}
                              onMouseEnter={(e) => { e.currentTarget.style.background = '#f2d7d5' }}
                              onMouseLeave={(e) => { e.currentTarget.style.background = '#f9ebea' }}
                            >
                              Anular criterio IA
                            </button>
                            {r.subfactor_activo && (
                              <button
                                onClick={() => deactivateMutation.mutate(r.subfactor_id)}
                                disabled={deactivateMutation.isPending}
                                style={{ padding: '5px 14px', fontSize: 11.5, fontWeight: 500, borderRadius: 8, border: '1.5px solid #d2b4de', background: '#f5eef8', color: '#7d3c98', cursor: 'pointer', whiteSpace: 'nowrap' }}
                                onMouseEnter={(e) => { e.currentTarget.style.background = '#e8daef' }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = '#f5eef8' }}
                              >
                                Solo desactivar
                              </button>
                            )}
                          </div>
                        )}

                        {/* ── Confirmed obsolete but still active — show deactivate button ── */}
                        {r.estado === 'obsoleto' && r.subfactor_activo && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
                            <button
                              onClick={() => deactivateMutation.mutate(r.subfactor_id)}
                              disabled={deactivateMutation.isPending}
                              style={{ padding: '7px 14px', fontSize: 12, fontWeight: 600, borderRadius: 8, border: '1.5px solid #f5b7b1', background: '#f9ebea', color: '#c0392b', cursor: 'pointer', whiteSpace: 'nowrap' }}
                              onMouseEnter={(e) => { e.currentTarget.style.background = '#f2d7d5' }}
                              onMouseLeave={(e) => { e.currentTarget.style.background = '#f9ebea' }}
                            >
                              ⊘ Desactivar del catálogo
                            </button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
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
  const isMobile = _useIsMobile()
  const [tab, setTab] = useState<'factores' | 'propuestas' | 'obsolescencia'>('factores')
  const [expandedJustif, setExpandedJustif] = useState<Set<number>>(new Set())
  const [generando, setGenerando] = useState(false)
  const [generandoDim, setGenerandoDim] = useState<string | null>(null)
  const [genMsg, setGenMsg] = useState('')
  const [genError, setGenError] = useState('')
  const [obsGenerando, setObsGenerando] = useState(false)
  const [obsGenerandoDim, setObsGenerandoDim] = useState<string | null>(null)
  const [obsPolling, setObsPolling] = useState(false)
  const [obsMsg, setObsMsg] = useState('')
  const [obsError, setObsError] = useState('')
  const [propPolling, setPropPolling] = useState(false)
  const [limpiando, setLimpiando] = useState(false)
  const [limpiandoDim, setLimpiandoDim] = useState<string | null>(null)
  const [limpiarMsg, setLimpiarMsg] = useState('')
  const [limpiarError, setLimpiarError] = useState('')
  const [limpiandoObs, setLimpiandoObs] = useState(false)
  const [limpiandoObsDim, setLimpiandoObsDim] = useState<string | null>(null)
  const [limpiarObsMsg, setLimpiarObsMsg] = useState('')
  const [limpiarObsError, setLimpiarObsError] = useState('')
  const qc = useQueryClient()

  const { data: dims, isLoading } = useQuery({
    queryKey: ['catalogo'],
    queryFn: evaluacionesApi.catalogo,
    staleTime: 5 * 60 * 1000,
  })

  const { data: proposals = [], isLoading: propLoading, refetch: refetchProp } = useQuery({
    queryKey: ['ia-proposals'],
    queryFn: evaluacionesApi.proposals,
    enabled: isAdmin,
  })

  const { data: obsData, isLoading: obsLoading, refetch: refetchObs } = useQuery({
    queryKey: ['ia-obsolescence'],
    queryFn: () => evaluacionesApi.obsolescenceReports(true),
    enabled: isAdmin,
  })
  const obsReports = obsData?.results ?? []
  const obsSummary = obsData?.summary ?? null

  const { data: obsProgress, refetch: refetchProgress } = useQuery({
    queryKey: ['obs-progress'],
    queryFn: evaluacionesApi.obsolescenceProgress,
    refetchInterval: obsPolling ? 3000 : false,
    enabled: isAdmin,
  })

  const { data: propProgress, refetch: refetchPropProgress } = useQuery({
    queryKey: ['prop-progress'],
    queryFn: evaluacionesApi.proposalProgress,
    refetchInterval: propPolling ? 3000 : false,
    enabled: isAdmin,
  })

  useEffect(() => {
    if (obsPolling && obsProgress && !obsProgress.running) {
      setObsPolling(false)
      refetchObs()
    }
  }, [obsProgress?.running, obsPolling])

  useEffect(() => {
    if (propPolling && propProgress && !propProgress.running) {
      setPropPolling(false)
      refetchProp()
    }
  }, [propProgress?.running, propPolling])

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

  const deactivateSubfactorMutation = useMutation({
    mutationFn: (subfactorId: number) => evaluacionesApi.updateSubfactor(subfactorId, { activo: false }),
    onSuccess: () => { refetchObs(); qc.invalidateQueries({ queryKey: ['catalogo'] }) },
  })

  const pendingCount = proposals.filter((p) => p.estado === 'pendiente').length
  const pendingObs = obsSummary?.pendientes ?? obsReports.filter((r) => r.estado === 'pendiente').length
  const clearableObs = (obsSummary?.pendientes ?? 0) + (obsSummary?.vigentes_ia ?? 0)

  const totalFactores = dims?.reduce((acc, d) => acc + d.factores.length, 0) ?? 0
  // Base count uses origen='original' so it's constant regardless of IA subfactor approvals/deactivations
  const totalSfBase = dims?.reduce((acc, d) => acc + d.factores.reduce((a, f) => a + f.subfactores.filter((s) => s.origen === 'original').length, 0), 0) ?? 0
  const totalIaActivos = dims?.reduce((acc, d) => acc + d.factores.reduce((a, f) => a + f.subfactores.filter((s) => s.origen === 'ia' && s.activo).length, 0), 0) ?? 0

  const handleGenerar = async (dimension?: string) => {
    if (dimension) setGenerandoDim(dimension); else setGenerando(true)
    setGenMsg(''); setGenError('')
    try {
      const res = await evaluacionesApi.generarPropuestas(undefined, 2, dimension)
      setGenMsg(res.detail)
      setPropPolling(true)
      setTimeout(() => refetchPropProgress(), 2000)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setGenError(msg ?? 'Error al iniciar la generación. Verifica la configuración del servidor.')
    } finally { if (dimension) setGenerandoDim(null); else setGenerando(false) }
  }

  const handleGenerarObs = async (dimension?: string) => {
    if (dimension) setObsGenerandoDim(dimension); else setObsGenerando(true)
    setObsMsg(''); setObsError('')
    try {
      const res = await evaluacionesApi.generateObsolescence(undefined, dimension)
      setObsMsg(res.detail)
      setObsPolling(true)
      setTimeout(() => refetchProgress(), 2000)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setObsError(msg ?? 'Error al iniciar el análisis. Verifica la configuración del servidor.')
    } finally { if (dimension) setObsGenerandoDim(null); else setObsGenerando(false) }
  }

  const handleLimpiar = async (dimension?: string) => {
    if (dimension) setLimpiandoDim(dimension); else setLimpiando(true)
    setLimpiarMsg(''); setLimpiarError('')
    try {
      const res = await evaluacionesApi.limpiarPropuestas(dimension)
      setLimpiarMsg(res.detail)
      refetchProp()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setLimpiarError(msg ?? 'Error al limpiar propuestas.')
    } finally { if (dimension) setLimpiandoDim(null); else setLimpiando(false) }
  }

  const handleLimpiarObs = async (dimension?: string) => {
    if (dimension) setLimpiandoObsDim(dimension); else setLimpiandoObs(true)
    setLimpiarObsMsg(''); setLimpiarObsError('')
    try {
      const res = await evaluacionesApi.limpiarObsolescencia(dimension)
      setLimpiarObsMsg(res.detail)
      refetchObs()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setLimpiarObsError(msg ?? 'Error al limpiar reportes.')
    } finally { if (dimension) setLimpiandoObsDim(null); else setLimpiandoObs(false) }
  }

  const toggleJustif = (id: number) => {
    setExpandedJustif((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  // Build grouped structure for proposals tab — always use the catalog as base
  // so all 3 dimensions and all factors appear even with 0 proposals.
  const proposalsByDim = useMemo(() => {
    const map: Record<string, Record<string, {
      factor_codigo: string; factor_nombre: string; factor_is: number; proposals: SubfactorProposal[]
    }>> = {}
    // Initialize every dimension and factor from catalog
    if (dims) {
      for (const dim of dims) {
        map[dim.codigo] = {}
        for (const f of dim.factores) {
          map[dim.codigo][f.codigo] = { factor_codigo: f.codigo, factor_nombre: f.nombre, factor_is: f.is_valor, proposals: [] }
        }
      }
    }
    // Populate with actual proposals
    for (const p of proposals) {
      if (map[p.dimension_codigo]?.[p.factor_codigo]) {
        map[p.dimension_codigo][p.factor_codigo].proposals.push(p)
      }
    }
    return map
  }, [dims, proposals])

  // Build grouped structure for obsolescence tab — catalog as base so all 3 dims always show
  const obsByDim = useMemo(() => {
    const map: Record<string, Record<string, {
      factor_codigo: string; factor_nombre: string; factor_is: number; reports: SubfactorObsolescenceReport[]
    }>> = {}
    if (dims) {
      for (const dim of dims) {
        map[dim.codigo] = {}
        for (const f of dim.factores) {
          map[dim.codigo][f.codigo] = { factor_codigo: f.codigo, factor_nombre: f.nombre, factor_is: f.is_valor, reports: [] }
        }
      }
    }
    for (const r of obsReports) {
      if (map[r.dimension_codigo]?.[r.factor_codigo]) {
        map[r.dimension_codigo][r.factor_codigo].reports.push(r)
      }
    }
    return map
  }, [dims, obsReports])

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
            Metodología GUIOS — Rea Sánchez, Universidad de Sevilla (2022)
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          {isAdmin && tab === 'propuestas' && (
            <button
              onClick={() => handleGenerar()} disabled={generando || !!generandoDim}
              style={{ display: 'flex', alignItems: 'center', gap: 8, background: (generando || generandoDim) ? 'var(--mid)' : 'var(--dark)', color: 'var(--white)', border: 'none', borderRadius: 8, padding: '10px 18px', fontSize: 13, fontWeight: 500, cursor: (generando || generandoDim) ? 'not-allowed' : 'pointer', opacity: (generando || generandoDim) ? 0.7 : 1 }}
              onMouseEnter={(e) => { if (!generando && !generandoDim) e.currentTarget.style.background = 'var(--mid)' }}
              onMouseLeave={(e) => { if (!generando && !generandoDim) e.currentTarget.style.background = 'var(--dark)' }}
            >
              <span style={{ fontSize: 15 }}>⊕</span>
              {generando ? 'Generando...' : 'Todas las dimensiones'}
            </button>
          )}
          {isAdmin && tab === 'propuestas' && pendingCount > 0 && (
            <button
              onClick={() => handleLimpiar()} disabled={limpiando || !!limpiandoDim}
              style={{ display: 'flex', alignItems: 'center', gap: 8, background: (limpiando || limpiandoDim) ? '#e5a355' : '#ca6f1e', color: 'var(--white)', border: 'none', borderRadius: 8, padding: '10px 18px', fontSize: 13, fontWeight: 500, cursor: (limpiando || limpiandoDim) ? 'not-allowed' : 'pointer', opacity: (limpiando || limpiandoDim) ? 0.7 : 1 }}
              onMouseEnter={(e) => { if (!limpiando && !limpiandoDim) e.currentTarget.style.background = '#e5a355' }}
              onMouseLeave={(e) => { if (!limpiando && !limpiandoDim) e.currentTarget.style.background = '#ca6f1e' }}
            >
              ↺ {limpiando ? 'Limpiando...' : 'Limpiar pendientes'}
            </button>
          )}
          {isAdmin && tab === 'obsolescencia' && (
            <button
              onClick={() => handleGenerarObs()} disabled={obsGenerando || obsPolling || !!obsGenerandoDim}
              style={{ display: 'flex', alignItems: 'center', gap: 8, background: (obsGenerando || obsPolling || obsGenerandoDim) ? 'var(--mid)' : '#7d3c98', color: 'var(--white)', border: 'none', borderRadius: 8, padding: '10px 18px', fontSize: 13, fontWeight: 500, cursor: (obsGenerando || obsPolling || obsGenerandoDim) ? 'not-allowed' : 'pointer', opacity: (obsGenerando || obsPolling || obsGenerandoDim) ? 0.7 : 1 }}
              onMouseEnter={(e) => { if (!obsGenerando && !obsPolling && !obsGenerandoDim) e.currentTarget.style.background = '#6c3483' }}
              onMouseLeave={(e) => { if (!obsGenerando && !obsPolling && !obsGenerandoDim) e.currentTarget.style.background = '#7d3c98' }}
            >
              <span style={{ fontSize: 14 }}>⚑</span>
              {obsGenerando ? 'Iniciando...' : obsPolling ? 'Analizando...' : 'Todas las dimensiones'}
            </button>
          )}
          {isAdmin && tab === 'obsolescencia' && clearableObs > 0 && (
            <button
              onClick={() => handleLimpiarObs()} disabled={limpiandoObs || !!limpiandoObsDim}
              style={{ display: 'flex', alignItems: 'center', gap: 8, background: (limpiandoObs || limpiandoObsDim) ? '#e57373' : '#922b21', color: 'var(--white)', border: 'none', borderRadius: 8, padding: '10px 18px', fontSize: 13, fontWeight: 500, cursor: (limpiandoObs || limpiandoObsDim) ? 'not-allowed' : 'pointer', opacity: (limpiandoObs || limpiandoObsDim) ? 0.7 : 1 }}
              onMouseEnter={(e) => { if (!limpiandoObs && !limpiandoObsDim) e.currentTarget.style.background = '#e57373' }}
              onMouseLeave={(e) => { if (!limpiandoObs && !limpiandoObsDim) e.currentTarget.style.background = '#922b21' }}
            >
              ↺ {limpiandoObs ? 'Limpiando...' : 'Limpiar pendientes'}
            </button>
          )}
        </div>
      </div>

      {/* Banners */}
      {genMsg && <div style={{ background: '#ebf5fb', border: '1px solid #aed6f1', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 13, color: 'var(--blue)', display: 'flex', gap: 8 }}>ℹ {genMsg}</div>}
      {genError && <div style={{ background: '#f9ebea', border: '1px solid #e59866', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 13, color: 'var(--red)', display: 'flex', gap: 8 }}>✕ {genError}</div>}
      {limpiarMsg && <div style={{ background: '#fef5e7', border: '1px solid #f0b27a', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 13, color: '#ca6f1e', display: 'flex', gap: 8 }}>↺ {limpiarMsg}</div>}
      {limpiarError && <div style={{ background: '#f9ebea', border: '1px solid #e59866', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 13, color: 'var(--red)', display: 'flex', gap: 8 }}>✕ {limpiarError}</div>}
      {obsMsg && <div style={{ background: '#f5eef8', border: '1px solid #d2b4de', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 13, color: '#6c3483', display: 'flex', gap: 8 }}>ℹ {obsMsg}</div>}
      {obsError && <div style={{ background: '#f9ebea', border: '1px solid #e59866', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 13, color: 'var(--red)', display: 'flex', gap: 8 }}>✕ {obsError}</div>}
      {limpiarObsMsg && <div style={{ background: '#fdedec', border: '1px solid #f1948a', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 13, color: '#922b21', display: 'flex', gap: 8 }}>↺ {limpiarObsMsg}</div>}
      {limpiarObsError && <div style={{ background: '#f9ebea', border: '1px solid #e59866', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 13, color: 'var(--red)', display: 'flex', gap: 8 }}>✕ {limpiarObsError}</div>}

      {/* Stats */}
      {!isLoading && dims && (
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
          {[
            { label: 'Dimensiones', value: dims.length },
            { label: 'Factores', value: totalFactores },
            { label: 'Subfactores base', value: totalSfBase },
            { label: 'Subfactores IA activos', value: totalIaActivos },
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
              <span>Modo edición activo — haz clic en el icono <strong>✎</strong> junto a cualquier subfactor para editar su nombre, descripción o estado. Al desactivar un subfactor IA, volverá automáticamente a la pestaña <strong>Propuestas IA</strong>.</span>
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
            <span style={{ fontSize: 10.5, color: 'var(--gray3)', marginLeft: 4 }}>= Subfactor IA activo</span>
          </div>

          {isLoading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[1, 2, 3].map((i) => <div key={i} style={{ height: 56, borderRadius: 10, background: '#eaecee', animation: 'pulse 1.5s ease-in-out infinite' }} />)}
            </div>
          )}

          {dims?.map((dim) => (
            <DimensionSection
              key={dim.id}
              dim={dim}
              isAdmin={isAdmin}
              obsReports={obsReports}
              onIaDeactivated={() => setTab('propuestas')}
            />
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
          {/* Progress bar — visible while generation is running */}
          {(propPolling || propProgress?.running) && propProgress && propProgress.total > 0 && (
            <div style={{ background: '#ebf5fb', border: '1px solid #aed6f1', borderRadius: 8, padding: '12px 16px', marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 12.5, fontWeight: 600, color: '#1a5276' }}>Generando propuestas IA...</span>
                <span style={{ fontSize: 12, color: '#2980b9', fontFamily: '"DM Mono", monospace' }}>
                  {propProgress.completed} / {propProgress.total} factores
                </span>
              </div>
              <div style={{ height: 8, background: '#d6eaf8', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', width: `${propProgress.porcentaje}%`,
                  background: 'linear-gradient(90deg, #2980b9, #5dade2)',
                  borderRadius: 4, transition: 'width 0.4s ease',
                }} />
              </div>
              <div style={{ fontSize: 11, color: '#2471a3', marginTop: 5 }}>
                {propProgress.porcentaje < 100
                  ? `${Math.round(propProgress.porcentaje)}% completado — las propuestas aparecerán al finalizar`
                  : 'Finalizando...'}
              </div>
            </div>
          )}
          {/* Summary counts */}
          {pendingCount > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, padding: '9px 14px', background: '#fef9e7', border: '1px solid #f9e79f', borderRadius: 8 }}>
              <span style={{ fontSize: 20, fontFamily: '"DM Mono", monospace', fontWeight: 700, color: '#e67e22' }}>{pendingCount}</span>
              <span style={{ fontSize: 13, color: '#9a7d0a' }}>propuesta{pendingCount !== 1 ? 's' : ''} pendiente{pendingCount !== 1 ? 's' : ''} de revisión</span>
            </div>
          )}
          <p style={{ fontSize: 13, color: 'var(--gray2)', lineHeight: 1.6, marginBottom: 16 }}>
            Subfactores propuestos por la IA basados en literatura científica 2020-2026. Las propuestas marcadas con <strong>↩ Retornada</strong> corresponden a subfactores IA previamente aprobados que fueron desactivados — puedes reactivarlos directamente.
          </p>
          {propLoading ? (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--gray2)', fontSize: 13 }}>Cargando propuestas...</div>
          ) : proposals.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', background: 'var(--white)', border: '1px solid rgba(0,0,0,0.07)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)', color: 'var(--gray2)', fontSize: 13 }}>
              No hay propuestas. Usa el botón <strong>Generar propuestas IA</strong> para crearlas.
            </div>
          ) : (
            // Use catalog dimension order (T → O → E)
            (dims ?? []).map((dim) => {
              const factorsMap = proposalsByDim[dim.codigo] ?? {}
              return (
                <ProposalDimSection
                  key={dim.codigo}
                  dimCode={dim.codigo}
                  factors={dim.factores.map((f) => factorsMap[f.codigo] ?? { factor_codigo: f.codigo, factor_nombre: f.nombre, factor_is: f.is_valor, proposals: [] })}
                  proposals={Object.values(factorsMap).flatMap((f) => f.proposals)}
                  expandedJustif={expandedJustif}
                  onToggleJustif={toggleJustif}
                  reviewMutation={reviewMutation}
                  onGenerate={() => handleGenerar(dim.codigo)}
                  generating={generandoDim === dim.codigo}
                  onLimpiar={() => handleLimpiar(dim.codigo)}
                  limpiando={limpiandoDim === dim.codigo}
                />
              )
            })
          )}
        </div>
      )}

      {/* ── Tab: Obsolescencia IA ── */}
      {tab === 'obsolescencia' && isAdmin && (
        <div>
          {/* Progress bar — visible while analysis is running */}
          {(obsPolling || obsProgress?.running) && obsProgress && obsProgress.total > 0 && (
            <div style={{ background: '#f5eef8', border: '1px solid #d2b4de', borderRadius: 8, padding: '12px 16px', marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 12.5, fontWeight: 600, color: '#6c3483' }}>
                  Analizando subfactores con IA...
                </span>
                <span style={{ fontSize: 12, color: '#7d3c98', fontFamily: '"DM Mono", monospace' }}>
                  {obsProgress.completed} / {obsProgress.total}
                </span>
              </div>
              <div style={{ height: 8, background: '#e8daef', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${obsProgress.porcentaje}%`,
                  background: 'linear-gradient(90deg, #7d3c98, #a569bd)',
                  borderRadius: 4,
                  transition: 'width 0.4s ease',
                }} />
              </div>
              <div style={{ fontSize: 11, color: '#9b59b6', marginTop: 5 }}>
                {obsProgress.porcentaje < 100
                  ? `${Math.round(obsProgress.porcentaje)}% completado — los resultados aparecerán automáticamente al finalizar`
                  : 'Finalizando análisis...'}
              </div>
            </div>
          )}

          {/* Pending summary */}
          {pendingObs > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, padding: '9px 14px', background: '#f9ebea', border: '1px solid #f5b7b1', borderRadius: 8 }}>
              <span style={{ fontSize: 20, fontFamily: '"DM Mono", monospace', fontWeight: 700, color: '#c0392b' }}>{pendingObs}</span>
              <span style={{ fontSize: 13, color: '#922b21' }}>subfactor{pendingObs !== 1 ? 'es' : ''} potencialmente obsoleto{pendingObs !== 1 ? 's' : ''} pendiente{pendingObs !== 1 ? 's' : ''} de revisión</span>
            </div>
          )}
          {/* Description */}
          <p style={{ fontSize: 13, color: 'var(--gray2)', lineHeight: 1.6, margin: '0 0 16px' }}>
            Subfactores del catálogo clasificados por la IA según literatura científica 2020-2026. Los pendientes de revisión requieren decisión del administrador.
          </p>

          {obsLoading ? (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--gray2)', fontSize: 13 }}>Cargando análisis...</div>
          ) : !dims || (!obsSummary && obsReports.length === 0) ? (
            <div style={{ padding: 40, textAlign: 'center', background: 'var(--white)', border: '1px solid rgba(0,0,0,0.07)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)' }}>
              <p style={{ color: 'var(--gray2)', fontSize: 13 }}>
                No hay análisis. Usa <strong>Detectar obsoletos con IA</strong> para iniciar el análisis de todo el catálogo.
              </p>
            </div>
          ) : (
            (dims ?? []).map((dim) => {
              const factorsMap = obsByDim[dim.codigo] ?? {}
              return (
                <ObsDimSection
                  key={dim.codigo}
                  dimCode={dim.codigo}
                  factors={dim.factores.map((f) => factorsMap[f.codigo] ?? { factor_codigo: f.codigo, factor_nombre: f.nombre, factor_is: f.is_valor, reports: [] })}
                  obsReviewMutation={obsReviewMutation}
                  deactivateMutation={deactivateSubfactorMutation}
                  onGenerateObs={() => handleGenerarObs(dim.codigo)}
                  generatingObs={obsGenerandoDim === dim.codigo}
                  onLimpiarObs={() => handleLimpiarObs(dim.codigo)}
                  limpiandoObs={limpiandoObsDim === dim.codigo}
                />
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
