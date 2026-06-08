import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { evaluacionesApi, type EvaluacionFactor } from '@/api/evaluaciones'

const DIM_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  T: { bg: '#ebf5fb', color: '#1a5276', label: 'Tecnológica' },
  O: { bg: '#eafaf1', color: '#1e8449', label: 'Organizacional' },
  E: { bg: '#fef9e7', color: '#b7770d', label: 'Económica' },
}

const isAutoExcluded = (f: EvaluacionFactor) => f.importancia_relativa === 1

export function Paso2({ evaluacionId }: { evaluacionId: number }) {
  const navigate = useNavigate()
  const qc = useQueryClient()

  const { data: factors = [], isLoading } = useQuery({
    queryKey: ['paso2', evaluacionId],
    queryFn: () => evaluacionesApi.paso2Get(evaluacionId),
  })

  // relevante map: factor_id → boolean
  const [relMap, setRelMap] = useState<Record<number, boolean>>({})

  useEffect(() => {
    if (!factors.length) return
    const initial: Record<number, boolean> = {}
    factors.forEach((f) => { initial[f.factor] = f.relevante })
    setRelMap(initial)
  }, [factors])

  const saveMutation = useMutation({
    mutationFn: (factores: { factor_id: number; relevante: number }[]) =>
      evaluacionesApi.paso2Save(evaluacionId, factores),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['evaluacion', String(evaluacionId)] })
      qc.invalidateQueries({ queryKey: ['paso2', evaluacionId] })
      qc.invalidateQueries({ queryKey: ['paso3', evaluacionId] })
    },
  })

  const autoExcluidos = factors.filter(isAutoExcluded)
  const toggleables = factors.filter((f) => !isAutoExcluded(f))
  const relevanteCount = toggleables.filter((f) => relMap[f.factor] !== false).length
  const excluidoCount = toggleables.filter((f) => relMap[f.factor] === false).length + autoExcluidos.length
  const total = factors.length

  const toggleFactor = (factorId: number) => {
    const f = factors.find((x) => x.factor === factorId)
    if (f && isAutoExcluded(f)) return  // IR=1 factors are locked
    setRelMap((prev) => ({ ...prev, [factorId]: !prev[factorId] }))
  }

  const handleSave = () => {
    // Only send toggleable factors — IR=1 factors are handled server-side
    const factores = Object.entries(relMap)
      .filter(([factor_id]) => {
        const f = factors.find((x) => x.factor === Number(factor_id))
        return f && !isAutoExcluded(f)
      })
      .map(([factor_id, relevante]) => ({
        factor_id: Number(factor_id),
        relevante: relevante ? 1 : 0,
      }))
    saveMutation.mutate(factores, {
      onSuccess: () => navigate(`/evaluacion/${evaluacionId}?paso=3`, { replace: true }),
    })
  }

  if (isLoading) return <LoadingState />

  // Group by dimension
  const byDim: Record<string, EvaluacionFactor[]> = {}
  factors.forEach((f) => {
    const dim = f.dimension_codigo
    if (!byDim[dim]) byDim[dim] = []
    byDim[dim].push(f)
  })

  const excluidoList = factors.filter((f) => isAutoExcluded(f) || relMap[f.factor] === false)

  return (
    <div>
      {/* Intro */}
      <div style={{ marginBottom: 22 }}>
        <h3 style={{ fontFamily: '"DM Sans", sans-serif', fontSize: 20, fontWeight: 600, color: 'var(--dark)', marginBottom: 8 }}>
          Paso 2 — Relevancia de factores
        </h3>
        <p style={{ color: 'var(--gray2)', fontSize: 13.5, lineHeight: 1.6, maxWidth: 680 }}>
          Revisa los factores y marca cuáles son <strong style={{ color: 'var(--dark)' }}>aplicables a tu evaluación</strong>.
          Los factores excluidos no participarán en el cálculo del FODA. Por defecto todos están incluidos.
        </p>
      </div>

      {/* Summary badges */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 22, flexWrap: 'wrap' }}>
        <div style={{ padding: '10px 20px', borderRadius: 8, background: '#eafaf1', color: 'var(--green)', display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontFamily: '"DM Mono", monospace', fontSize: 24, fontWeight: 700 }}>{relevanteCount}</span>
          <span style={{ fontSize: 14 }}>Para evaluar</span>
        </div>
        <div style={{ padding: '10px 20px', borderRadius: 8, background: '#f9ebea', color: 'var(--red)', display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontFamily: '"DM Mono", monospace', fontSize: 24, fontWeight: 700 }}>{excluidoCount}</span>
          <span style={{ fontSize: 14 }}>Excluidos</span>
        </div>
        <div style={{ padding: '10px 20px', borderRadius: 8, background: '#f2f3f4', color: 'var(--gray2)', display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontFamily: '"DM Mono", monospace', fontSize: 24, fontWeight: 700 }}>{total}</span>
          <span style={{ fontSize: 14 }}>Total</span>
        </div>
      </div>

      {/* Info box */}
      <div style={{ background: '#fef9e7', border: '1px solid #f0b27a', borderRadius: 8, padding: '12px 14px', fontSize: 13, color: 'var(--orange)', display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: autoExcluidos.length > 0 ? 12 : 24, lineHeight: 1.5 }}>
        <span style={{ fontSize: 16, flexShrink: 0 }}>⚠</span>
        <span>Excluir demasiados factores puede reducir la precisión del análisis FODA. Se recomienda mantener al menos 10 factores activos.</span>
      </div>
      {autoExcluidos.length > 0 && (
        <div style={{ background: '#f9f9f9', border: '1px solid #eaecee', borderRadius: 8, padding: '12px 14px', fontSize: 13, color: 'var(--gray2)', display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 24, lineHeight: 1.5 }}>
          <span style={{ fontSize: 16, flexShrink: 0 }}>⊘</span>
          <span>
            <strong style={{ color: 'var(--gray1)' }}>{autoExcluidos.length} factor{autoExcluidos.length !== 1 ? 'es' : ''} excluido{autoExcluidos.length !== 1 ? 's' : ''} automáticamente</strong> (IR=1).
            Esto ocurre cuando la importancia que asignaste (ID) combinada con la importancia del sistema (IS) produce un valor de importancia relativa igual a 1 — el factor no puede incluirse en la evaluación según la metodología GUIOS.
          </span>
        </div>
      )}

      {/* Factor grid by dimension */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {Object.entries(byDim).map(([dim, dimFactors]) => {
          const dimStyle = DIM_STYLE[dim] ?? DIM_STYLE['T']
          const activeInDim = dimFactors.filter((f) => relMap[f.factor] !== false).length

          return (
            <div key={dim}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <div style={{ width: 26, height: 26, borderRadius: '50%', background: dimStyle.bg, color: dimStyle.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>
                  {dim}
                </div>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--dark)' }}>Dimensión {dimStyle.label}</span>
                <span style={{ fontSize: 12, color: 'var(--gray2)', marginLeft: 4 }}>{activeInDim}/{dimFactors.length} activos</span>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {dimFactors.map((f) => {
                  const locked = isAutoExcluded(f)
                  const isActive = !locked && relMap[f.factor] !== false
                  return (
                    <button
                      key={f.factor}
                      onClick={() => toggleFactor(f.factor)}
                      title={locked ? `IR=1: excluido automáticamente (ID × IS = 1)` : undefined}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        borderRadius: 20, padding: '6px 14px',
                        fontSize: 13, fontWeight: 500,
                        cursor: locked ? 'not-allowed' : 'pointer',
                        transition: 'all 0.18s',
                        border: locked ? '1px solid #eaecee' : `1px solid ${isActive ? '#a9dfbf' : '#d5d8dc'}`,
                        background: locked ? '#f9f9f9' : isActive ? '#eafaf1' : '#f2f3f4',
                        color: locked ? '#bbb' : isActive ? 'var(--green)' : 'var(--gray2)',
                        textDecoration: (!locked && !isActive) ? 'line-through' : 'none',
                        opacity: locked ? 0.5 : isActive ? 1 : 0.65,
                      }}
                    >
                      <span style={{ fontFamily: '"DM Mono", monospace', fontSize: 11, opacity: 0.7 }}>{f.factor_codigo}</span>
                      {f.factor_nombre}
                      <span style={{ fontSize: 13 }}>{locked ? '⊘' : isActive ? '✓' : '✕'}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* Lista visual de excluidos */}
      {excluidoList.length > 0 && (
        <div style={{ marginTop: 28, background: '#f9ebea', borderRadius: 'var(--radius)', padding: '16px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--red)' }}>✕ Factores excluidos ({excluidoList.length})</span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {excluidoList.map((f) => (
              <span key={f.factor} style={{ fontSize: 12, color: 'var(--red)', background: 'rgba(146,43,33,0.08)', border: '1px solid rgba(146,43,33,0.2)', padding: '3px 10px', borderRadius: 16 }}>
                {f.factor_codigo} · {f.factor_nombre}
              </span>
            ))}
          </div>
          <p style={{ fontSize: 12, color: 'var(--gray2)', marginTop: 10, fontStyle: 'italic' }}>
            Haz clic en los factores de arriba para reactivarlos.
          </p>
        </div>
      )}

      {/* Footer */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 24, paddingTop: 20, borderTop: '1px solid #eaecee', flexWrap: 'wrap', gap: 12 }}>
        <button
          onClick={() => navigate(`/evaluacion/${evaluacionId}?paso=1`)}
          style={{ background: 'transparent', color: 'var(--gray1)', border: '1.5px solid #d5d8dc', borderRadius: 8, padding: '10px 20px', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--gray4)' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
        >
          ← Paso anterior
        </button>
        <button
          onClick={handleSave}
          disabled={saveMutation.isPending || relevanteCount === 0}
          style={{
            background: 'var(--dark)', color: 'var(--white)', border: 'none', borderRadius: 8,
            padding: '11px 26px', fontSize: 14, fontWeight: 500,
            cursor: relevanteCount === 0 ? 'not-allowed' : 'pointer',
            opacity: relevanteCount === 0 ? 0.5 : 1,
          }}
          onMouseEnter={(e) => { if (relevanteCount > 0) e.currentTarget.style.background = 'var(--mid)' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--dark)' }}
        >
          {saveMutation.isPending ? 'Guardando...' : 'Guardar y continuar →'}
        </button>
      </div>
    </div>
  )
}

function LoadingState() {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {Array.from({ length: 18 }).map((_, i) => (
        <div key={i} style={{ height: 36, width: 140, borderRadius: 20, background: '#eaecee' }} />
      ))}
    </div>
  )
}
