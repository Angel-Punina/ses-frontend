import { useQuery } from '@tanstack/react-query'
import { evaluacionesApi, type FactorRanking } from '@/api/evaluaciones'

const DIM_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  T: { bg: '#ebf5fb', color: '#1a5276', label: 'Tecnológica' },
  O: { bg: '#eafaf1', color: '#1e8449', label: 'Organizacional' },
  E: { bg: '#fef9e7', color: '#b7770d', label: 'Económica' },
}

const FODA_STYLE: Record<string, { color: string; bg: string; label: string }> = {
  Fortaleza:   { color: '#1a5e31', bg: '#eafaf1', label: 'Fortalezas' },
  Oportunidad: { color: '#1a4c7a', bg: '#ebf5fb', label: 'Oportunidades' },
  Debilidad:   { color: '#7b241c', bg: '#f9ebea', label: 'Debilidades' },
  Amenaza:     { color: '#7d4f00', bg: '#fef9e7', label: 'Amenazas' },
}

const REC_STYLE: Record<string, { color: string; bg: string }> = {
  'Adoptar':          { color: 'var(--green)',  bg: '#eafaf1' },
  'Con condiciones':  { color: 'var(--orange)', bg: '#fef9e7' },
  'No adoptar':       { color: 'var(--red)',    bg: '#f9ebea' },
}

function StatCard({ icon, label, value, bg, color }: { icon: string; label: string; value: number; bg: string; color: string }) {
  return (
    <div style={{ background: 'var(--white)', border: '1px solid rgba(0,0,0,0.07)', borderRadius: 'var(--radius)', padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 14, boxShadow: 'var(--shadow)' }}>
      <div style={{ width: 44, height: 44, borderRadius: 12, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, color, flexShrink: 0 }}>{icon}</div>
      <div>
        <span style={{ display: 'block', fontFamily: '"DM Mono", monospace', fontSize: 28, fontWeight: 700, color: 'var(--dark)', lineHeight: 1 }}>{value}</span>
        <span style={{ display: 'block', fontSize: 12, color: 'var(--gray2)', marginTop: 3 }}>{label}</span>
      </div>
    </div>
  )
}

function PmBar({ pm, color }: { pm: number; color: string }) {
  const pct = Math.round(Math.max(0, (pm - 1) / 3) * 100)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 8, background: '#eaecee', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ height: '100%', background: color, width: `${pct}%`, borderRadius: 4, transition: 'width 0.5s' }} />
      </div>
      <span style={{ fontSize: 12, fontFamily: '"DM Mono", monospace', color, fontWeight: 600, minWidth: 32 }}>{pm.toFixed(2)}</span>
    </div>
  )
}

function pmColor(pm: number): string {
  if (pm >= 3.0) return 'var(--green)'
  if (pm >= 2.0) return 'var(--orange)'
  return 'var(--red)'
}

export function ReportesView() {
  const { data, isLoading } = useQuery({
    queryKey: ['reporte-general'],
    queryFn: evaluacionesApi.reporteGeneral,
  })

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {[1, 2, 3].map((i) => (
          <div key={i} style={{ height: 80, borderRadius: 'var(--radius)', background: '#eaecee' }} />
        ))}
      </div>
    )
  }

  if (!data) return null

  const { total, completadas, en_progreso, borradores, recomendaciones, foda_global, factor_ranking, por_mes, avg_tiempo_dias } = data

  const topFortalezas = factor_ranking.filter(f => f.avg_pm >= 3.0).slice(0, 5)
  const topDebilidades = [...factor_ranking].sort((a, b) => a.avg_pm - b.avg_pm).filter(f => f.avg_pm < 3.0).slice(0, 5)

  const maxMonth = Math.max(1, ...Object.values(por_mes))
  const fodaTotal = Object.values(foda_global).reduce((a, b) => a + b, 0) || 1
  const recTotal = Object.values(recomendaciones).reduce((a, b) => a + b, 0) || 1

  return (
    <div>
      <div style={{ marginBottom: 22 }}>
        <h2 style={{ fontFamily: '"DM Sans", sans-serif', fontSize: 22, fontWeight: 700, color: 'var(--dark)', marginBottom: 3 }}>
          Análisis y Reportes
        </h2>
        <p style={{ color: 'var(--gray2)', fontSize: 13 }}>
          Estadísticas agregadas de tus evaluaciones GUIOS — factores, resultados FODA y tendencias.
        </p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 14, marginBottom: 22 }}>
        <StatCard icon="◎" label="Evaluaciones totales"  value={total}       bg="#ebf5fb" color="var(--blue)" />
        <StatCard icon="✓" label="Completadas"           value={completadas} bg="#eafaf1" color="var(--green)" />
        <StatCard icon="◑" label="En progreso"           value={en_progreso} bg="#fef9e7" color="var(--orange)" />
        <StatCard icon="○" label="Borradores"            value={borradores}  bg="#f2f3f4" color="var(--gray2)" />
      </div>

      {completadas === 0 ? (
        <EmptyState />
      ) : (
        <>
          {/* Fila 1: Recomendaciones + FODA global */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>

            {/* Distribución recomendaciones */}
            <div style={{ background: 'var(--white)', border: '1px solid rgba(0,0,0,0.07)', borderRadius: 'var(--radius)', padding: '22px 24px', boxShadow: 'var(--shadow)' }}>
              <SectionTitle>Recomendaciones GUIOS</SectionTitle>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {(Object.entries(recomendaciones) as [string, number][]).map(([key, count]) => {
                  const style = REC_STYLE[key]
                  const pct = Math.round((count / recTotal) * 100)
                  return (
                    <div key={key}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, padding: '2px 10px', borderRadius: 16, background: style.bg, color: style.color }}>{key}</span>
                        <span style={{ fontSize: 12, fontFamily: '"DM Mono", monospace', color: 'var(--gray2)' }}>{count} · {pct}%</span>
                      </div>
                      <div style={{ height: 8, background: '#eaecee', borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{ height: '100%', background: style.color, width: `${pct}%`, borderRadius: 4, transition: 'width 0.5s' }} />
                      </div>
                    </div>
                  )
                })}
                {avg_tiempo_dias > 0 && (
                  <p style={{ fontSize: 11.5, color: 'var(--gray3)', marginTop: 4, fontStyle: 'italic' }}>
                    Tiempo promedio para completar: <strong style={{ color: 'var(--gray2)' }}>{avg_tiempo_dias} días</strong>
                  </p>
                )}
              </div>
            </div>

            {/* FODA global */}
            <div style={{ background: 'var(--white)', border: '1px solid rgba(0,0,0,0.07)', borderRadius: 'var(--radius)', padding: '22px 24px', boxShadow: 'var(--shadow)' }}>
              <SectionTitle>Distribución FODA acumulada</SectionTitle>
              <p style={{ fontSize: 12, color: 'var(--gray3)', marginBottom: 14 }}>
                Suma de todas las clasificaciones FODA en evaluaciones completadas.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {(Object.entries(foda_global) as [string, number][]).map(([key, count]) => {
                  const style = FODA_STYLE[key]
                  const pct = Math.round((count / fodaTotal) * 100)
                  return (
                    <div key={key} style={{ background: style.bg, borderRadius: 8, padding: '12px 14px' }}>
                      <div style={{ fontSize: 11, color: style.color, fontWeight: 600, marginBottom: 4 }}>{style.label}</div>
                      <div style={{ fontFamily: '"DM Mono", monospace', fontSize: 24, fontWeight: 700, color: style.color, lineHeight: 1 }}>{count}</div>
                      <div style={{ fontSize: 11, color: style.color, opacity: 0.7, marginTop: 2 }}>{pct}% del total</div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Fila 2: Ranking de factores */}
          {factor_ranking.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>

              {/* Top fortalezas */}
              <div style={{ background: 'var(--white)', border: '1px solid rgba(0,0,0,0.07)', borderRadius: 'var(--radius)', padding: '22px 24px', boxShadow: 'var(--shadow)' }}>
                <SectionTitle>Factores más fuertes</SectionTitle>
                <p style={{ fontSize: 12, color: 'var(--gray3)', marginBottom: 14 }}>
                  PM promedio ≥ 3.0 — clasificación Fortaleza / Oportunidad.
                </p>
                {topFortalezas.length === 0 ? (
                  <p style={{ color: 'var(--gray3)', fontSize: 13 }}>Sin fortalezas registradas aún.</p>
                ) : (
                  <FactorList factors={topFortalezas} />
                )}
              </div>

              {/* Áreas de mejora */}
              <div style={{ background: 'var(--white)', border: '1px solid rgba(0,0,0,0.07)', borderRadius: 'var(--radius)', padding: '22px 24px', boxShadow: 'var(--shadow)' }}>
                <SectionTitle>Áreas de mejora</SectionTitle>
                <p style={{ fontSize: 12, color: 'var(--gray3)', marginBottom: 14 }}>
                  PM promedio &lt; 3.0 — clasificación Debilidad / Amenaza.
                </p>
                {topDebilidades.length === 0 ? (
                  <p style={{ color: 'var(--gray3)', fontSize: 13 }}>Sin debilidades registradas aún.</p>
                ) : (
                  <FactorList factors={topDebilidades} />
                )}
              </div>
            </div>
          )}

          {/* Fila 3: Todos los factores + Historial mensual */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 16 }}>

            {/* Ranking completo */}
            {factor_ranking.length > 0 && (
              <div style={{ background: 'var(--white)', border: '1px solid rgba(0,0,0,0.07)', borderRadius: 'var(--radius)', padding: '22px 24px', boxShadow: 'var(--shadow)' }}>
                <SectionTitle>Rendimiento por factor (PM promedio)</SectionTitle>
                <p style={{ fontSize: 12, color: 'var(--gray3)', marginBottom: 14 }}>
                  Puntuación Media promedio entre todas las evaluaciones completadas. Escala 1–4.
                </p>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#fafbfc', borderBottom: '1px solid #eaecee' }}>
                      {['Factor', 'Dimensión', 'PM promedio', 'Evals'].map((h) => (
                        <th key={h} style={{ padding: '8px 12px', fontSize: 11, fontWeight: 600, color: 'var(--gray2)', textAlign: 'left' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {factor_ranking.map((f) => {
                      const dimStyle = DIM_STYLE[f.dimension] ?? DIM_STYLE['T']
                      return (
                        <tr key={f.codigo} style={{ borderBottom: '1px solid #f5f6f7' }}
                          onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = '#fafbfc' }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = 'transparent' }}
                        >
                          <td style={{ padding: '10px 12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ fontSize: 10, fontFamily: '"DM Mono", monospace', color: 'var(--gray2)', background: '#f2f3f4', padding: '1px 5px', borderRadius: 4 }}>{f.codigo}</span>
                              <span style={{ fontSize: 13, color: 'var(--dark)', fontWeight: 500 }}>{f.nombre}</span>
                            </div>
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 12, background: dimStyle.bg, color: dimStyle.color }}>{dimStyle.label}</span>
                          </td>
                          <td style={{ padding: '10px 12px', minWidth: 140 }}>
                            <PmBar pm={f.avg_pm} color={pmColor(f.avg_pm)} />
                          </td>
                          <td style={{ padding: '10px 12px', fontSize: 12, color: 'var(--gray2)', textAlign: 'center' }}>{f.count}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Historial mensual */}
            <div style={{ background: 'var(--white)', border: '1px solid rgba(0,0,0,0.07)', borderRadius: 'var(--radius)', padding: '22px 24px', boxShadow: 'var(--shadow)' }}>
              <SectionTitle>Evaluaciones completadas por mes</SectionTitle>
              {Object.keys(por_mes).length === 0 ? (
                <p style={{ color: 'var(--gray3)', fontSize: 13 }}>Sin datos por mes aún.</p>
              ) : (
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 140, paddingBottom: 4, marginTop: 14 }}>
                  {(Object.entries(por_mes) as [string, number][]).map(([month, count]) => {
                    const h = Math.round((count / maxMonth) * 100)
                    const label = new Date(month + '-02').toLocaleDateString('es-ES', { month: 'short', year: '2-digit' })
                    return (
                      <div key={month} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                        <span style={{ fontSize: 11, fontFamily: '"DM Mono", monospace', color: 'var(--gray2)', fontWeight: 600 }}>{count}</span>
                        <div style={{ width: '100%', height: `${h}%`, background: 'var(--light)', borderRadius: '4px 4px 0 0', minHeight: 4 }} />
                        <span style={{ fontSize: 10, color: 'var(--gray3)', whiteSpace: 'nowrap' }}>{label}</span>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Leyenda PM */}
              <div style={{ marginTop: 24, borderTop: '1px solid #eaecee', paddingTop: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--gray2)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 10 }}>
                  Escala PM
                </div>
                {[
                  { range: '3.0 – 4.0', label: 'Fortaleza / Oportunidad', color: 'var(--green)' },
                  { range: '2.0 – 2.9', label: 'Riesgo moderado', color: 'var(--orange)' },
                  { range: '1.0 – 1.9', label: 'Debilidad / Amenaza', color: 'var(--red)' },
                ].map((item) => (
                  <div key={item.range} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <div style={{ width: 10, height: 10, borderRadius: 2, background: item.color, flexShrink: 0 }} />
                    <span style={{ fontSize: 11, color: 'var(--gray2)' }}>
                      <span style={{ fontFamily: '"DM Mono", monospace', fontWeight: 600 }}>{item.range}</span> — {item.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 style={{ fontFamily: '"DM Sans", sans-serif', fontSize: 14, fontWeight: 600, color: 'var(--dark)', marginBottom: 12 }}>
      {children}
    </h3>
  )
}

function FactorList({ factors }: { factors: FactorRanking[] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {factors.map((f) => {
        const dimStyle = DIM_STYLE[f.dimension] ?? DIM_STYLE['T']
        return (
          <div key={f.codigo}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                <span style={{ fontSize: 10, fontFamily: '"DM Mono", monospace', color: 'var(--gray2)', background: '#f2f3f4', padding: '1px 5px', borderRadius: 4, flexShrink: 0 }}>{f.codigo}</span>
                <span style={{ fontSize: 12.5, color: 'var(--dark)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.nombre}</span>
              </div>
              <span style={{ fontSize: 10, fontWeight: 600, padding: '1px 7px', borderRadius: 10, background: dimStyle.bg, color: dimStyle.color, flexShrink: 0, marginLeft: 6 }}>{f.dimension}</span>
            </div>
            <PmBar pm={f.avg_pm} color={pmColor(f.avg_pm)} />
          </div>
        )
      })}
    </div>
  )
}

function EmptyState() {
  return (
    <div style={{ background: 'var(--white)', border: '1.5px dashed #d5d8dc', borderRadius: 'var(--radius)', padding: '60px 32px', textAlign: 'center', boxShadow: 'var(--shadow)' }}>
      <div style={{ width: 52, height: 52, borderRadius: 14, background: '#f2f3f4', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 22, color: 'var(--gray2)' }}>⬡</div>
      <p style={{ color: 'var(--gray2)', fontSize: 14, marginBottom: 6 }}>No hay evaluaciones completadas aún.</p>
      <p style={{ color: 'var(--gray3)', fontSize: 12 }}>Completa tu primera evaluación GUIOS para ver el análisis aquí.</p>
    </div>
  )
}
