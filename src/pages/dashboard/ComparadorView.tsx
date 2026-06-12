import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { evaluacionesApi, type CompararResponse, type ComparativoSoftwareResponse } from '@/api/evaluaciones'

const DIM_LABEL: Record<string, string> = {
  T: 'Tecnológica', O: 'Organizacional', E: 'Económica',
}

const DIM_COLOR: Record<string, { bg: string; color: string }> = {
  T: { bg: '#ebf5fb', color: '#1a5276' },
  O: { bg: '#eafaf1', color: '#1e8449' },
  E: { bg: '#fef9e7', color: '#b7770d' },
}

const FODA_COLOR: Record<string, { bg: string; color: string }> = {
  Fortaleza: { bg: '#eafaf1', color: 'var(--green)' },
  Oportunidad: { bg: '#ebf5fb', color: 'var(--blue)' },
  Debilidad: { bg: '#f9ebea', color: 'var(--red)' },
  Amenaza: { bg: '#fef9e7', color: 'var(--orange)' },
  '': { bg: '#f2f3f4', color: 'var(--gray2)' },
}

const RECOMENDACION_STYLE: Record<string, { bg: string; color: string }> = {
  Adoptar: { bg: '#eafaf1', color: 'var(--green)' },
  'Con condiciones': { bg: '#fef9e7', color: 'var(--orange)' },
  'No adoptar': { bg: '#f9ebea', color: 'var(--red)' },
}

function PmBar({ pm }: { pm: number | null }) {
  if (pm === null) return <span style={{ fontSize: 12, color: 'var(--gray3)' }}>—</span>
  const pct = (pm / 4) * 100
  const color = pm >= 3 ? 'var(--green)' : pm >= 2 ? 'var(--orange)' : 'var(--red)'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 100 }}>
      <div style={{ flex: 1, height: 6, background: '#eaecee', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ height: '100%', background: color, width: `${pct}%`, borderRadius: 4, transition: 'width 0.4s' }} />
      </div>
      <span style={{ fontSize: 12, fontFamily: '"DM Mono", monospace', color, fontWeight: 600, flexShrink: 0 }}>
        {pm.toFixed(2)}
      </span>
    </div>
  )
}

export function ComparadorView() {
  const { data: evals = [] } = useQuery({ queryKey: ['evaluaciones'], queryFn: evaluacionesApi.list })

  const completed = evals.filter((e) => e.estado === 'completada')
  const [selA, setSelA] = useState<string>('')
  const [selB, setSelB] = useState<string>('')
  const [iaOpen, setIaOpen] = useState(false)
  const [iaSoftware, setIaSoftware] = useState('')

  const canCompare = selA && selB && selA !== selB

  const { data: result, isLoading, error } = useQuery<CompararResponse>({
    queryKey: ['comparar', selA, selB],
    queryFn: () => evaluacionesApi.comparar([Number(selA), Number(selB)]),
    enabled: !!canCompare,
  })

  const { data: iaData, isLoading: iaLoading, isError: iaError } = useQuery<ComparativoSoftwareResponse>({
    queryKey: ['comparar-software-ia', iaSoftware],
    queryFn: () => evaluacionesApi.compararSoftware(iaSoftware),
    enabled: iaOpen && !!iaSoftware,
    staleTime: 5 * 60 * 1000,
  })

  const selectStyle: React.CSSProperties = {
    flex: 1, border: '1.5px solid #d5d8dc', borderRadius: 8, padding: '10px 14px',
    fontSize: 14, color: 'var(--gray1)', background: 'var(--white)', cursor: 'pointer',
  }

  return (
    <div>
      <div style={{ marginBottom: 22 }}>
        <h2 style={{ fontFamily: '"Fraunces", serif', fontSize: 22, fontWeight: 600, color: 'var(--dark)', marginBottom: 3 }}>
          Comparar Software
        </h2>
        <p style={{ color: 'var(--gray2)', fontSize: 13 }}>
          Selecciona dos evaluaciones completadas para comparar sus resultados GUIOS lado a lado.
        </p>
      </div>

      {/* Selector */}
      <div style={{ background: 'var(--white)', border: '1px solid rgba(0,0,0,0.07)', borderRadius: 'var(--radius)', padding: '22px 26px', boxShadow: 'var(--shadow)', marginBottom: 22 }}>
        {completed.length < 2 ? (
          <div style={{ textAlign: 'center', color: 'var(--gray2)', fontSize: 13.5, padding: '20px 0' }}>
            Necesitas al menos <strong>2 evaluaciones completadas</strong> para poder comparar.
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5, flex: 1, minWidth: 200 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--gray2)' }}>EVALUACIÓN A</label>
              <select value={selA} onChange={(e) => setSelA(e.target.value)} style={selectStyle}>
                <option value="">Seleccionar...</option>
                {completed.map((ev) => (
                  <option key={ev.id} value={ev.id} disabled={ev.id === Number(selB)}>{ev.nombre} — {ev.software}</option>
                ))}
              </select>
            </div>
            <span style={{ fontSize: 22, color: 'var(--gray3)', fontWeight: 300, paddingTop: 18 }}>⇄</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5, flex: 1, minWidth: 200 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--gray2)' }}>EVALUACIÓN B</label>
              <select value={selB} onChange={(e) => setSelB(e.target.value)} style={selectStyle}>
                <option value="">Seleccionar...</option>
                {completed.map((ev) => (
                  <option key={ev.id} value={ev.id} disabled={ev.id === Number(selA)}>{ev.nombre} — {ev.software}</option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Loading */}
      {isLoading && (
        <div style={{ background: 'var(--white)', border: '1px solid rgba(0,0,0,0.07)', borderRadius: 'var(--radius)', padding: 40, textAlign: 'center', color: 'var(--gray2)', fontSize: 13 }}>
          Cargando comparación...
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{ background: '#f9ebea', border: '1px solid #e59866', borderRadius: 'var(--radius)', padding: '16px 20px', fontSize: 13, color: 'var(--red)' }}>
          Error al cargar la comparación. Asegúrate de que ambas evaluaciones estén completadas.
        </div>
      )}

      {/* Results */}
      {result && !isLoading && (
        <CompararTable result={result} />
      )}

      {/* IA Comparative analysis panel */}
      {result && !isLoading && (
        <div style={{ marginTop: 20, border: '1.5px solid #d5d8dc', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
          <button
            onClick={() => {
              if (!iaOpen && !iaSoftware) {
                const softwareA = result.evaluaciones[0]?.software ?? ''
                setIaSoftware(softwareA)
              }
              setIaOpen((v) => !v)
            }}
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', background: iaOpen ? '#fafbfc' : 'var(--white)', border: 'none', cursor: 'pointer', gap: 12 }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 15 }}>✦</span>
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--dark)' }}>Análisis comparativo IA</span>
              <span style={{ fontSize: 12, color: 'var(--gray2)' }}>— patrones y consistencia entre contextos organizacionales</span>
            </div>
            <span style={{ fontSize: 12, color: 'var(--gray2)', transform: iaOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▼</span>
          </button>

          {iaOpen && (
            <div style={{ borderTop: '1px solid #eaecee', padding: '18px 20px' }}>
              {/* Software selector */}
              <div style={{ display: 'flex', gap: 10, marginBottom: 18, alignItems: 'center', flexWrap: 'wrap' }}>
                <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--gray1)', flexShrink: 0 }}>Analizar software:</label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {Array.from(new Set(result.evaluaciones.map((e) => e.software))).map((sw) => (
                    <button
                      key={sw}
                      onClick={() => setIaSoftware(sw)}
                      style={{
                        padding: '6px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer',
                        background: iaSoftware === sw ? 'var(--dark)' : 'transparent',
                        color: iaSoftware === sw ? 'var(--white)' : 'var(--gray1)',
                        border: `1.5px solid ${iaSoftware === sw ? 'var(--dark)' : '#d5d8dc'}`,
                      }}
                    >{sw}</button>
                  ))}
                </div>
              </div>

              {iaLoading && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {[1, 2, 3].map((i) => (
                    <div key={i} style={{ height: 44, background: '#eaecee', borderRadius: 8, animation: 'pulse 1.5s ease-in-out infinite' }} />
                  ))}
                </div>
              )}
              {iaError && (
                <p style={{ fontSize: 13, color: 'var(--gray2)', textAlign: 'center', padding: '16px 0' }}>
                  No se pudo obtener el análisis. Intenta de nuevo.
                </p>
              )}
              {iaData && !iaLoading && (
                <IaComparativoPanel data={iaData} />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

const CONSIST_STYLE = {
  alta:  { color: '#1e8449', bg: '#eafaf1', border: '#a9dfbf', label: 'Consistente' },
  media: { color: '#b7770d', bg: '#fef9e7', border: '#f0c96a', label: 'Variable' },
  baja:  { color: '#922b21', bg: '#f9ebea', border: '#e6beba', label: 'Inconsistente' },
} as const

function IaComparativoPanel({ data }: { data: ComparativoSoftwareResponse }) {
  return (
    <div>
      {data.resumen_ia && (
        <div style={{ background: '#ebf5fb', border: '1px solid #aed6f1', borderRadius: 8, padding: '13px 16px', marginBottom: 18 }}>
          <p style={{ fontSize: 13.5, color: '#1a5276', lineHeight: 1.65, margin: 0 }}>{data.resumen_ia}</p>
        </div>
      )}

      {data.evaluaciones.length > 0 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
          {data.evaluaciones.map((ev) => {
            const recStyle = { Adoptar: { bg: '#eafaf1', color: 'var(--green)' }, 'Con condiciones': { bg: '#fef9e7', color: 'var(--orange)' }, 'No adoptar': { bg: '#f9ebea', color: 'var(--red)' } }[ev.recomendacion ?? ''] ?? { bg: '#f2f3f4', color: 'var(--gray2)' }
            return (
              <div key={ev.id} style={{ padding: '7px 12px', borderRadius: 8, border: '1px solid #eaecee', background: 'var(--white)', fontSize: 12 }}>
                <span style={{ fontWeight: 600, color: 'var(--dark)' }}>{ev.organizacion || 'Sin org.'}</span>
                {ev.recomendacion && (
                  <span style={{ marginLeft: 8, padding: '2px 8px', borderRadius: 10, background: recStyle.bg, color: recStyle.color, fontWeight: 600, fontSize: 11 }}>
                    {ev.recomendacion}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      )}

      {data.factores_clave.length > 0 ? (
        <div style={{ background: 'var(--white)', border: '1px solid rgba(0,0,0,0.07)', borderRadius: 'var(--radius)', overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 560 }}>
            <thead>
              <tr style={{ background: '#fafbfc', borderBottom: '1px solid #eaecee' }}>
                <th style={{ padding: '9px 14px', fontSize: 11, fontWeight: 600, color: 'var(--gray2)', textAlign: 'left' }}>Factor</th>
                <th style={{ padding: '9px 14px', fontSize: 11, fontWeight: 600, color: 'var(--gray2)', textAlign: 'center', minWidth: 70 }}>PM prom.</th>
                <th style={{ padding: '9px 14px', fontSize: 11, fontWeight: 600, color: 'var(--gray2)', textAlign: 'center', minWidth: 60 }}>Rango</th>
                <th style={{ padding: '9px 14px', fontSize: 11, fontWeight: 600, color: 'var(--gray2)', textAlign: 'left', minWidth: 120 }}>Consistencia</th>
                <th style={{ padding: '9px 14px', fontSize: 11, fontWeight: 600, color: 'var(--gray2)', textAlign: 'left' }}>FODA distribución</th>
              </tr>
            </thead>
            <tbody>
              {data.factores_clave.map((f, i) => {
                const cs = CONSIST_STYLE[f.consistencia]
                const dimStyle = DIM_COLOR[f.dimension] ?? DIM_COLOR['T']
                return (
                  <tr key={f.codigo} style={{ borderBottom: i < data.factores_clave.length - 1 ? '1px solid #f5f6f7' : 'none' }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = '#fafbfc' }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = 'transparent' }}
                  >
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ width: 20, height: 20, borderRadius: '50%', background: dimStyle.bg, color: dimStyle.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, flexShrink: 0 }}>{f.dimension}</span>
                        <span style={{ fontSize: 10, fontFamily: '"DM Mono", monospace', color: 'var(--gray2)', background: '#f2f3f4', padding: '1px 5px', borderRadius: 4 }}>{f.codigo}</span>
                        <span style={{ fontSize: 12.5, color: 'var(--dark)' }}>{f.nombre}</span>
                      </div>
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                      <span style={{ fontFamily: '"DM Mono", monospace', fontSize: 13, fontWeight: 700, color: f.avg_pm >= 3 ? 'var(--green)' : f.avg_pm >= 2 ? 'var(--orange)' : 'var(--red)' }}>
                        {f.avg_pm.toFixed(1)}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                      <span style={{ fontFamily: '"DM Mono", monospace', fontSize: 12, color: f.pm_range > 1.5 ? 'var(--red)' : f.pm_range > 0.5 ? 'var(--orange)' : 'var(--green)' }}>
                        ±{f.pm_range.toFixed(1)}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 10, background: cs.bg, color: cs.color, border: `1px solid ${cs.border}` }}>
                        {cs.label}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                        {Object.entries(f.foda_distribucion).map(([cat, count]) => {
                          const fc = FODA_COLOR[cat] ?? FODA_COLOR['']
                          return (
                            <span key={cat} style={{ fontSize: 10.5, fontWeight: 600, padding: '1px 7px', borderRadius: 10, background: fc.bg, color: fc.color }}>
                              {cat} ×{count}
                            </span>
                          )
                        })}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p style={{ fontSize: 13, color: 'var(--gray2)', textAlign: 'center', padding: '16px 0' }}>
          No hay suficientes evaluaciones completadas para este software.
        </p>
      )}
    </div>
  )
}

function CompararTable({ result }: { result: CompararResponse }) {
  const { evaluaciones, factores } = result
  const [filterDim, setFilterDim] = useState<string>('')

  const dims = Array.from(new Set(factores.map((f) => f.dimension_codigo)))
  const filtered = filterDim ? factores.filter((f) => f.dimension_codigo === filterDim) : factores

  return (
    <div>
      {/* Header cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 18 }}>
        {evaluaciones.map((ev, i) => {
          const label = i === 0 ? 'A' : 'B'
          const recStyle = RECOMENDACION_STYLE[ev.recomendacion] ?? { bg: '#f2f3f4', color: 'var(--gray2)' }
          return (
            <div key={ev.id} style={{ background: 'var(--white)', border: '1.5px solid #d5d8dc', borderRadius: 'var(--radius)', padding: '18px 22px', boxShadow: 'var(--shadow)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <span style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--dark)', color: 'var(--white)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{label}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: 14, fontWeight: 600, color: 'var(--dark)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ev.nombre}</span>
                  <span style={{ display: 'block', fontSize: 12, color: 'var(--gray2)' }}>{ev.software}{ev.organizacion ? ` · ${ev.organizacion}` : ''}</span>
                </div>
              </div>
              {ev.recomendacion && (
                <span style={{ fontSize: 12, fontWeight: 600, padding: '4px 12px', borderRadius: 20, background: recStyle.bg, color: recStyle.color }}>
                  {ev.recomendacion}
                </span>
              )}
            </div>
          )
        })}
      </div>

      {/* Dimension filter */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
        {[{ key: '', label: 'Todas las dimensiones' }, ...dims.map((d) => ({ key: d, label: DIM_LABEL[d] ?? d }))].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilterDim(key)}
            style={{
              fontSize: 12.5, fontWeight: filterDim === key ? 600 : 400,
              padding: '5px 14px', borderRadius: 20, border: '1.5px solid',
              borderColor: filterDim === key ? 'var(--dark)' : '#d5d8dc',
              background: filterDim === key ? 'var(--dark)' : 'var(--white)',
              color: filterDim === key ? 'var(--white)' : 'var(--gray2)',
              cursor: 'pointer',
            }}
          >{label}</button>
        ))}
      </div>

      {/* Table */}
      <div style={{ background: 'var(--white)', border: '1px solid rgba(0,0,0,0.07)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)', overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
          <thead>
            <tr style={{ background: '#fafbfc', borderBottom: '1px solid #eaecee' }}>
              <th style={{ padding: '10px 16px', fontSize: 11.5, fontWeight: 600, color: 'var(--gray2)', textAlign: 'left', width: 40 }}>Dim.</th>
              <th style={{ padding: '10px 16px', fontSize: 11.5, fontWeight: 600, color: 'var(--gray2)', textAlign: 'left' }}>Factor</th>
              {evaluaciones.map((ev, i) => (
                <th key={ev.id} style={{ padding: '10px 16px', fontSize: 11.5, fontWeight: 600, color: 'var(--gray2)', textAlign: 'left', minWidth: 160 }}>
                  <span style={{ display: 'inline-block', width: 18, height: 18, borderRadius: '50%', background: 'var(--dark)', color: 'var(--white)', textAlign: 'center', fontSize: 10, fontWeight: 700, lineHeight: '18px', marginRight: 6 }}>
                    {i === 0 ? 'A' : 'B'}
                  </span>
                  {ev.software}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((f) => {
              const dimStyle = DIM_COLOR[f.dimension_codigo] ?? DIM_COLOR['T']
              return (
                <tr key={f.factor_codigo} style={{ borderBottom: '1px solid #f5f6f7' }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = '#fafbfc' }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = 'transparent' }}
                >
                  <td style={{ padding: '11px 16px' }}>
                    <span style={{ display: 'inline-block', width: 22, height: 22, borderRadius: '50%', background: dimStyle.bg, color: dimStyle.color, textAlign: 'center', fontSize: 10, fontWeight: 700, lineHeight: '22px' }}>
                      {f.dimension_codigo}
                    </span>
                  </td>
                  <td style={{ padding: '11px 16px' }}>
                    <span style={{ fontSize: 10.5, fontFamily: '"DM Mono", monospace', color: 'var(--gray2)', background: '#f2f3f4', padding: '1px 5px', borderRadius: 4, marginRight: 6 }}>{f.factor_codigo}</span>
                    <span style={{ fontSize: 13, color: 'var(--dark)' }}>{f.factor_nombre}</span>
                  </td>
                  {f.values.map((v, vi) => {
                    const fodaStyle = FODA_COLOR[v.foda] ?? FODA_COLOR['']
                    return (
                      <td key={vi} style={{ padding: '11px 16px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          <PmBar pm={v.pm} />
                          {v.foda && (
                            <span style={{ fontSize: 10.5, fontWeight: 600, padding: '2px 8px', borderRadius: 12, background: fodaStyle.bg, color: fodaStyle.color, display: 'inline-block', width: 'fit-content' }}>
                              {v.foda}
                            </span>
                          )}
                        </div>
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <p style={{ fontSize: 11.5, color: 'var(--gray3)', marginTop: 10, fontStyle: 'italic' }}>
        PM = Ponderación Media (escala 1–4) · Solo factores marcados como relevantes en cada evaluación
      </p>
    </div>
  )
}
