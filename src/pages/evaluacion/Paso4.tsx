import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { evaluacionesApi, type EvaluacionFactor } from '@/api/evaluaciones'

const DIM_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  T: { bg: '#ebf5fb', color: '#1a5276', label: 'Tecnológica' },
  O: { bg: '#eafaf1', color: '#1e8449', label: 'Organizacional' },
  E: { bg: '#fef9e7', color: '#b7770d', label: 'Económica' },
}

const FODA_STYLE: Record<string, { color: string; bg: string }> = {
  Fortaleza: { color: '#27ae60', bg: '#eafaf1' },
  Debilidad: { color: '#e74c3c', bg: '#f9ebea' },
  Oportunidad: { color: '#2980b9', bg: '#ebf5fb' },
  Amenaza: { color: '#e67e22', bg: '#fef9e7' },
}

export function Paso4({ evaluacionId }: { evaluacionId: number }) {
  const navigate = useNavigate()
  const qc = useQueryClient()

  const { data: factors = [], isLoading } = useQuery({
    queryKey: ['paso4', evaluacionId],
    queryFn: () => evaluacionesApi.paso4Get(evaluacionId),
  })

  const continueMutation = useMutation({
    mutationFn: () => evaluacionesApi.paso4Continue(evaluacionId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['evaluacion', String(evaluacionId)] })
      navigate(`/evaluacion/${evaluacionId}?paso=5`, { replace: true })
    },
  })

  // Group by dimension
  const byDim: Record<string, EvaluacionFactor[]> = {}
  factors.forEach((f) => {
    if (!byDim[f.dimension_codigo]) byDim[f.dimension_codigo] = []
    byDim[f.dimension_codigo].push(f)
  })

  const withPm = factors.filter((f) => f.pm !== null)
  const fortalezas = withPm.filter((f) => f.foda === 'Fortaleza').length
  const debilidades = withPm.filter((f) => f.foda === 'Debilidad').length

  if (isLoading) return <LoadingState />

  return (
    <div>
      {/* Intro */}
      <div style={{ marginBottom: 22 }}>
        <h3 style={{ fontFamily: '"DM Sans", sans-serif', fontSize: 20, fontWeight: 600, color: 'var(--dark)', marginBottom: 8 }}>
          Paso 4 — Puntuación media por factor
        </h3>
        <p style={{ color: 'var(--gray2)', fontSize: 13.5, lineHeight: 1.6, maxWidth: 680 }}>
          El sistema ha calculado la <strong style={{ color: 'var(--dark)' }}>Puntuación Media (PM)</strong> de cada factor
          a partir de tus evaluaciones. Revisa los resultados antes de continuar con la clasificación FODA.
        </p>
      </div>

      {/* Summary badges */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 22, flexWrap: 'wrap' }}>
        <div style={{ padding: '10px 20px', borderRadius: 8, background: '#eafaf1', color: 'var(--green)', display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontFamily: '"DM Mono", monospace', fontSize: 24, fontWeight: 700 }}>{fortalezas}</span>
          <span style={{ fontSize: 14 }}>Fortalezas</span>
        </div>
        <div style={{ padding: '10px 20px', borderRadius: 8, background: '#f9ebea', color: 'var(--red)', display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontFamily: '"DM Mono", monospace', fontSize: 24, fontWeight: 700 }}>{debilidades}</span>
          <span style={{ fontSize: 14 }}>Debilidades</span>
        </div>
        <div style={{ padding: '10px 20px', borderRadius: 8, background: '#f2f3f4', color: 'var(--gray2)', display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontFamily: '"DM Mono", monospace', fontSize: 24, fontWeight: 700 }}>{withPm.length}</span>
          <span style={{ fontSize: 14 }}>Factores evaluados</span>
        </div>
      </div>

      {/* Info box */}
      <div style={{ background: '#fef9e7', border: '1px solid #f0b27a', borderRadius: 8, padding: '12px 14px', fontSize: 13, color: 'var(--orange)', display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 24, lineHeight: 1.5 }}>
        <span style={{ fontSize: 16, flexShrink: 0 }}>⚠</span>
        <span>Esta clasificación es provisional (sin soporte externo). En el siguiente paso podrás indicar qué factores tienen apoyo externo, lo que puede reclasificar Fortalezas en Oportunidades y Debilidades en Amenazas.</span>
      </div>

      {/* Factors by dimension */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {Object.entries(byDim).map(([dim, dimFactors]) => {
          const dimStyle = DIM_STYLE[dim] ?? DIM_STYLE['T']
          return (
            <div key={dim}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <div style={{ width: 26, height: 26, borderRadius: '50%', background: dimStyle.bg, color: dimStyle.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>
                  {dim}
                </div>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--dark)' }}>Dimensión {dimStyle.label}</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {dimFactors.map((f) => {
                  const pm = f.pm ? parseFloat(f.pm) : null
                  const pct = pm !== null ? Math.round(Math.max(0, (pm - 1) / 3) * 100) : 0
                  const fstyle = FODA_STYLE[f.foda] ?? { color: '#888', bg: '#f5f5f5' }

                  return (
                    <div key={f.id} style={{ background: 'var(--white)', border: '1.5px solid #eaecee', borderRadius: 10, padding: '14px 18px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                          <span style={{ fontSize: 11, fontFamily: '"DM Mono", monospace', color: 'var(--gray2)', background: '#f2f3f4', padding: '1px 6px', borderRadius: 4, flexShrink: 0 }}>{f.factor_codigo}</span>
                          <span style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--dark)' }}>{f.factor_nombre}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                          <span style={{ fontFamily: '"DM Mono", monospace', fontSize: 15, fontWeight: 700, color: fstyle.color }}>
                            {pm !== null ? pm.toFixed(2) : '—'}
                          </span>
                          {f.foda && (
                            <span style={{ fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 14, background: fstyle.bg, color: fstyle.color }}>
                              {f.foda}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* PM progress bar */}
                      <div style={{ marginTop: 10 }}>
                        <div style={{ height: 8, background: '#eaecee', borderRadius: 4, overflow: 'hidden' }}>
                          <div style={{
                            height: '100%', borderRadius: 4, width: `${pct}%`,
                            background: fstyle.color, transition: 'width 0.5s ease',
                          }} />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 10.5, color: 'var(--gray3)' }}>
                          <span>1 — No cumple</span>
                          <span style={{ color: '#aaa' }}>umbral 3.0</span>
                          <span>4 — Cumple</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* Footer */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 28, paddingTop: 20, borderTop: '1px solid #eaecee', flexWrap: 'wrap', gap: 12 }}>
        <button
          onClick={() => navigate(`/evaluacion/${evaluacionId}?paso=3`)}
          style={{ background: 'transparent', color: 'var(--gray1)', border: '1.5px solid #d5d8dc', borderRadius: 8, padding: '10px 20px', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--gray4)' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
        >
          ← Paso anterior
        </button>
        <button
          onClick={() => continueMutation.mutate()}
          disabled={continueMutation.isPending}
          style={{ background: 'var(--dark)', color: 'var(--white)', border: 'none', borderRadius: 8, padding: '11px 26px', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--mid)' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--dark)' }}
        >
          {continueMutation.isPending ? 'Cargando...' : 'Continuar a FODA →'}
        </button>
      </div>
    </div>
  )
}

function LoadingState() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} style={{ background: 'var(--white)', border: '1.5px solid #eaecee', borderRadius: 10, height: 80, animation: 'pulse 1.5s ease-in-out infinite' }} />
      ))}
    </div>
  )
}
