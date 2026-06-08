import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { evaluacionesApi, type EvaluacionFactor } from '@/api/evaluaciones'

const ID_LABELS: Record<number, { label: string; short: string }> = {
  1: { label: 'Sin importancia', short: 'Nula' },
  2: { label: 'Baja importancia', short: 'Baja' },
  3: { label: 'Importancia media', short: 'Media' },
  4: { label: 'Alta importancia', short: 'Alta' },
}

const IS_LABEL: Record<number, string> = {
  1: 'IS Irrelevante',
  2: 'IS Opcional',
  3: 'IS Importante',
  4: 'IS Fundamental',
}

const DIM_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  T: { bg: '#ebf5fb', color: '#1a5276', label: 'Tecnológica' },
  O: { bg: '#eafaf1', color: '#1e8449', label: 'Organizacional' },
  E: { bg: '#fef9e7', color: '#b7770d', label: 'Económica' },
}

const SCALE_SELECTED: Record<number, { border: string; bg: string; color: string }> = {
  1: { border: '#922b21', bg: '#f9ebea', color: 'var(--red)' },
  2: { border: '#566573', bg: '#f2f3f4', color: 'var(--gray2)' },
  3: { border: '#e67e22', bg: '#fef9e7', color: 'var(--orange)' },
  4: { border: '#27ae60', bg: '#eafaf1', color: 'var(--green)' },
}

export function Paso1({ evaluacionId }: { evaluacionId: number }) {
  const navigate = useNavigate()
  const qc = useQueryClient()

  const { data: factors = [], isLoading } = useQuery({
    queryKey: ['paso1', evaluacionId],
    queryFn: () => evaluacionesApi.paso1Get(evaluacionId),
  })

  // ie values: factor_id → value
  const [ieMap, setIeMap] = useState<Record<number, number>>({})
  // open accordions
  const [openDims, setOpenDims] = useState<Record<string, boolean>>({ T: true, O: false, E: false })

  useEffect(() => {
    if (!factors.length) return
    const initial: Record<number, number> = {}
    factors.forEach((f) => { if (f.ie) initial[f.factor] = f.ie })
    setIeMap(initial)
  }, [factors])

  const saveMutation = useMutation({
    mutationFn: (factores: { factor_id: number; ie: number }[]) =>
      evaluacionesApi.paso1Save(evaluacionId, factores),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['evaluacion', String(evaluacionId)] })
      qc.invalidateQueries({ queryKey: ['paso2', evaluacionId] })
    },
  })

  const scored = Object.keys(ieMap).length
  const total = factors.length
  const pct = total ? Math.round((scored / total) * 100) : 0
  const allScored = scored === total && total > 0
  const isIaPrecal = factors.length > 0 && factors[0]?.ia_sugerida

  // Group by dimension
  const byDim: Record<string, EvaluacionFactor[]> = {}
  factors.forEach((f) => {
    const dim = f.dimension_codigo
    if (!byDim[dim]) byDim[dim] = []
    byDim[dim].push(f)
  })

  const handleSave = () => {
    const factores = Object.entries(ieMap).map(([factor_id, ie]) => ({
      factor_id: Number(factor_id),
      ie,
    }))
    saveMutation.mutate(factores, {
      onSuccess: () => navigate(`/evaluacion/${evaluacionId}?paso=2`, { replace: true }),
    })
  }

  if (isLoading) return <LoadingState />

  return (
    <div>
      {/* Intro */}
      <div style={{ marginBottom: 22 }}>
        <h3 style={{ fontFamily: '"DM Sans", sans-serif', fontSize: 20, fontWeight: 600, color: 'var(--dark)', marginBottom: 8 }}>
          Paso 1 — Importancia para la entidad
        </h3>
        <p style={{ color: 'var(--gray2)', fontSize: 13.5, lineHeight: 1.6, maxWidth: 680 }}>
          Indica el nivel de importancia que cada factor tiene <strong style={{ color: 'var(--dark)' }}>para tu organización</strong> (ID — Importancia del Decisor).
          Combinado con la IS (Importancia Sugerida por la metodología), se calcula la IR (Importancia Relativa). Factores con IR = 1 quedan excluidos de la evaluación.
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 14, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, color: 'var(--gray2)' }}>{scored} de {total} factores valorados</span>
          <div style={{ flex: 1, minWidth: 200, height: 6, background: '#eaecee', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ height: '100%', background: pct === 100 ? 'var(--green)' : 'var(--light)', borderRadius: 4, width: `${pct}%`, transition: 'width 0.4s' }} />
          </div>
          <span style={{ fontSize: 13, color: pct === 100 ? 'var(--green)' : 'var(--gray2)', fontWeight: pct === 100 ? 600 : 400 }}>{pct}%</span>
        </div>
      </div>

      {/* IA pre-qualification banner */}
      {isIaPrecal && (
        <div style={{ background: '#f5eef8', border: '1.5px solid #d2b4de', borderRadius: 10, padding: '13px 16px', fontSize: 13, color: '#6c3483', display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 16, lineHeight: 1.5 }}>
          <span style={{ fontSize: 17, flexShrink: 0 }}>✨</span>
          <div>
            <strong>Precalificación IA aplicada</strong> — Claude analizó el contexto de tu evaluación y pre-sugerió los valores de importancia. Revisa y ajusta según tu criterio antes de continuar.
          </div>
        </div>
      )}

      {/* Info box */}
      <div style={{ background: '#ebf5fb', border: '1px solid #aed6f1', borderRadius: 8, padding: '12px 14px', fontSize: 13, color: 'var(--blue)', display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 20, lineHeight: 1.5 }}>
        <span style={{ fontSize: 16, flexShrink: 0 }}>ℹ</span>
        <span>Valora del <strong>1 (Sin importancia)</strong> al <strong>4 (Alta importancia)</strong>. El IS (Importancia Sugerida) está predefinido según la Tabla 5.3 de la metodología GUIOS. Si asignas ID=1 a un factor con IS=1 o IS=2, ese factor quedará excluido automáticamente (IR=1).</span>
      </div>

      {/* Accordions by dimension */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {Object.entries(byDim).map(([dim, dimFactors]) => {
          const dimStyle = DIM_STYLE[dim] ?? DIM_STYLE['T']
          const scoredInDim = dimFactors.filter((f) => ieMap[f.factor] !== undefined).length
          const isOpen = openDims[dim]

          return (
            <div key={dim} style={{ background: 'var(--white)', border: '1.5px solid #d5d8dc', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)' }}>
              <div
                onClick={() => setOpenDims({ ...openDims, [dim]: !isOpen })}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '14px 18px',
                  cursor: 'pointer', userSelect: 'none',
                  borderBottom: isOpen ? '1px solid #eaecee' : 'none',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 26, height: 26, borderRadius: '50%', background: dimStyle.bg, color: dimStyle.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                    {dim}
                  </div>
                  <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--dark)' }}>
                    Dimensión {dimStyle.label}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 11, color: 'var(--gray2)' }}>{scoredInDim}/{dimFactors.length} valorados</span>
                  {scoredInDim === dimFactors.length && (
                    <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--green)', background: '#eafaf1', padding: '2px 8px', borderRadius: 12 }}>✓ Completo</span>
                  )}
                  <span style={{ color: 'var(--gray2)', fontSize: 14, transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.25s', display: 'block' }}>⌄</span>
                </div>
              </div>

              {isOpen && (
                <div>
                  {dimFactors.map((f) => {
                    const selected = ieMap[f.factor]
                    return (
                      <div key={f.factor} style={{
                        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
                        gap: 18, padding: '16px 20px', borderBottom: '1px solid #f2f3f4',
                        transition: 'background 0.15s', flexWrap: 'wrap',
                      }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = '#fafbfc' }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                      >
                        <div style={{ flex: 1, minWidth: 260 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                            <span style={{ fontSize: 11, fontFamily: '"DM Mono", monospace', color: 'var(--gray2)', background: '#f2f3f4', padding: '1px 6px', borderRadius: 4 }}>{f.factor_codigo}</span>
                            <strong style={{ fontSize: 14, color: 'var(--dark)' }}>{f.factor_nombre}</strong>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                            <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 12, background: dimStyle.bg, color: dimStyle.color }}>{dim}</span>
                            <span style={{ fontSize: 11.5, color: 'var(--gray2)' }}>
                              Sistema: <strong style={{ color: 'var(--blue)', fontFamily: '"DM Mono", monospace' }}>{IS_LABEL[f.factor_is]}</strong>
                            </span>
                          </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
                          <span style={{ fontSize: 11.5, color: 'var(--gray2)' }}>
                            ID organización {selected ? <strong style={{ color: 'var(--dark)' }}>→ {ID_LABELS[selected]?.short}</strong> : <span style={{ color: 'var(--accent)' }}>sin valorar</span>}
                          </span>
                          <ScaleGroup
                            value={selected ?? null}
                            onChange={(v) => setIeMap({ ...ieMap, [f.factor]: v })}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Footer */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 24, paddingTop: 20, borderTop: '1px solid #eaecee', flexWrap: 'wrap', gap: 12 }}>
        <span style={{ fontSize: 13, color: 'var(--gray2)' }}>
          {allScored
            ? <span style={{ color: 'var(--green)', fontWeight: 500 }}>✓ Todos los factores valorados</span>
            : <span style={{ color: scored > 0 ? 'var(--orange)' : 'var(--gray2)' }}>
                Faltan {total - scored} factor{total - scored !== 1 ? 'es' : ''} por valorar — debes completar todos antes de continuar
              </span>
          }
        </span>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={handleSave}
            disabled={saveMutation.isPending || !allScored}
            style={{
              background: 'var(--dark)', color: 'var(--white)', border: 'none', borderRadius: 8,
              padding: '11px 26px', fontSize: 14, fontWeight: 500,
              cursor: !allScored || saveMutation.isPending ? 'not-allowed' : 'pointer',
              opacity: !allScored ? 0.45 : 1,
              display: 'flex', alignItems: 'center', gap: 8,
            }}
            onMouseEnter={(e) => { if (allScored) e.currentTarget.style.background = 'var(--mid)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--dark)' }}
          >
            {saveMutation.isPending ? 'Guardando...' : 'Guardar y continuar →'}
          </button>
        </div>
      </div>
    </div>
  )
}

function ScaleGroup({ value, onChange }: { value: number | null; onChange: (v: number) => void }) {
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {[1, 2, 3, 4].map((v) => {
        const sel = value === v
        const selStyle = sel ? SCALE_SELECTED[v] : null
        return (
          <button
            key={v}
            onClick={() => onChange(v)}
            style={{
              border: `2px solid ${sel ? selStyle!.border : '#d5d8dc'}`,
              borderRadius: 7, width: 68, padding: '6px 4px',
              cursor: 'pointer', textAlign: 'center', fontSize: 11,
              color: sel ? selStyle!.color : 'var(--gray2)',
              background: sel ? selStyle!.bg : 'var(--white)',
              transition: 'all 0.18s', display: 'flex', flexDirection: 'column',
              alignItems: 'center', gap: 3, flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              if (!sel) {
                e.currentTarget.style.borderColor = 'var(--light)'
                e.currentTarget.style.background = '#ebf5fb'
                e.currentTarget.style.color = 'var(--blue)'
              }
            }}
            onMouseLeave={(e) => {
              if (!sel) {
                e.currentTarget.style.borderColor = '#d5d8dc'
                e.currentTarget.style.background = 'var(--white)'
                e.currentTarget.style.color = 'var(--gray2)'
              }
            }}
          >
            <span style={{ fontFamily: '"DM Mono", monospace', fontSize: 13, fontWeight: 600 }}>{v}</span>
            <span>{ID_LABELS[v].short}</span>
          </button>
        )
      })}
    </div>
  )
}

function LoadingState() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {[1, 2, 3].map((i) => (
        <div key={i} style={{ background: 'var(--white)', border: '1.5px solid #eaecee', borderRadius: 'var(--radius)', height: 60, animation: 'pulse 1.5s ease-in-out infinite' }} />
      ))}
    </div>
  )
}
