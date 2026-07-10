import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { evaluacionesApi } from '@/api/evaluaciones'
import { GlossaryTerm } from '@/lib/Tooltip'
import { useIsMobile } from '@/lib/useMediaQuery'

const FODA_CONFIG = {
  Fortaleza: {
    color: '#27ae60', bg: '#eafaf1', border: '#a9dfbf',
    label: 'Fortalezas', subtitle: 'Interno · PM ≥ 3',
    icon: <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#27ae60" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>,
  },
  Oportunidad: {
    color: '#2980b9', bg: '#ebf5fb', border: '#aed6f1',
    label: 'Oportunidades', subtitle: 'Externo · PM ≥ 3',
    icon: <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2980b9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 8 16 12 12 16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>,
  },
  Debilidad: {
    color: '#e67e22', bg: '#fef9e7', border: '#f9e79f',
    label: 'Debilidades', subtitle: 'Interno · PM < 3',
    icon: <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#e67e22" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 17 13.5 8.5 8.5 13.5 2 7"/><polyline points="16 17 22 17 22 11"/></svg>,
  },
  Amenaza: {
    color: '#e74c3c', bg: '#f9ebea', border: '#f1948a',
    label: 'Amenazas', subtitle: 'Externo · PM < 3',
    icon: <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#e74c3c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  },
}

function getFodaLabel(pm: number, tipoImpacto: 'interno' | 'externo'): string {
  const pos = pm >= 3.0
  if (tipoImpacto === 'externo') return pos ? 'Oportunidad' : 'Amenaza'
  return pos ? 'Fortaleza' : 'Debilidad'
}

function getFodaLiveSoporte(pm: number, tipoSoporte: 'interno' | 'externo' | null): string {
  if (!tipoSoporte) return '—'
  const pos = pm >= 3.0
  if (tipoSoporte === 'externo') return pos ? 'Oportunidad' : 'Amenaza'
  return pos ? 'Fortaleza' : 'Debilidad'
}

export function Paso5({ evaluacionId }: { evaluacionId: number }) {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const isMobile = useIsMobile()

  const { data: factors = [], isLoading } = useQuery({
    queryKey: ['paso5', evaluacionId],
    queryFn: () => evaluacionesApi.paso5Get(evaluacionId),
  })

  const [tipoSoporte, setTipoSoporte] = useState<'interno' | 'externo' | null>(null)

  useEffect(() => {
    if (!factors.length) return
    const soporteFactor = factors.find((f) => f.factor_es_soporte)
    if (soporteFactor && soporteFactor.soporte !== undefined) {
      setTipoSoporte(soporteFactor.soporte ? 'externo' : 'interno')
    }
  }, [factors])

  const saveMutation = useMutation({
    mutationFn: () => evaluacionesApi.paso5Save(evaluacionId, tipoSoporte),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['evaluacion', String(evaluacionId)] })
      qc.invalidateQueries({ queryKey: ['evaluaciones'] })
      qc.invalidateQueries({ queryKey: ['reporte-general'] })
      navigate(`/evaluacion/${evaluacionId}?paso=6`, { replace: true })
    },
  })

  const soporteFactor = factors.find((f) => f.factor_es_soporte)

  // Compute live FODA assignments
  type FodaKey = 'Fortaleza' | 'Oportunidad' | 'Debilidad' | 'Amenaza'
  const fodaGroups: Record<FodaKey, Array<{ nombre: string; pm: number; ir: number }>> = {
    Fortaleza: [], Oportunidad: [], Debilidad: [], Amenaza: [],
  }

  factors.forEach((f) => {
    if (f.pm === null) return
    const pm = parseFloat(f.pm)
    let foda: string
    if (f.factor_es_soporte) {
      foda = getFodaLiveSoporte(pm, tipoSoporte)
    } else {
      foda = getFodaLabel(pm, f.factor_tipo_impacto)
    }
    if (foda !== '—') {
      fodaGroups[foda as FodaKey].push({ nombre: f.factor_nombre, pm, ir: f.importancia_relativa ?? 0 })
    }
  })

  const positivos = fodaGroups.Fortaleza.length + fodaGroups.Oportunidad.length
  const negativos = fodaGroups.Debilidad.length + fodaGroups.Amenaza.length
  // Weighted score by IR — matches finalize_paso5 formula (faithful to UNEMI pilot)
  const scoreIR =
    fodaGroups.Fortaleza.reduce((s, f) => s + f.ir, 0) +
    fodaGroups.Oportunidad.reduce((s, f) => s + f.ir, 0) -
    fodaGroups.Debilidad.reduce((s, f) => s + f.ir, 0) -
    fodaGroups.Amenaza.reduce((s, f) => s + f.ir, 0)
  const recomLabel = scoreIR > 0 ? 'A — Adoptar' : scoreIR >= -3 ? 'B — Con condiciones' : 'C — No adoptar'
  const recomStyle = scoreIR > 0
    ? { color: 'var(--green)', bg: '#eafaf1' }
    : scoreIR >= -3
      ? { color: 'var(--orange)', bg: '#fef9e7' }
      : { color: 'var(--red)', bg: '#f9ebea' }

  if (isLoading) return <LoadingState />

  return (
    <div>
      <div style={{ marginBottom: 22 }}>
        <h3 style={{ fontFamily: '"DM Sans", sans-serif', fontSize: 20, fontWeight: 600, color: 'var(--dark)', marginBottom: 8 }}>
          Paso 5 — Análisis FODA
        </h3>
        <p style={{ color: 'var(--gray2)', fontSize: 13.5, lineHeight: 1.6, maxWidth: 680, margin: 0 }}>
          El sistema clasificó cada factor usando: <GlossaryTerm term="PM">PM</GlossaryTerm> ≥ 3 + interno = Fortaleza · PM ≥ 3 + externo = Oportunidad · PM &lt; 3 + interno = Debilidad · PM &lt; 3 + externo = Amenaza.
        </p>
      </div>

      {/* Summary stats */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : '1fr 1fr 1fr', gap: 10, marginBottom: 20 }}>
        {[
          { value: positivos, label: 'Positivos (F + O)', color: '#27ae60' },
          { value: negativos, label: 'Negativos (D + A)', color: '#e74c3c' },
          {
            value: scoreIR >= 0 ? `+${scoreIR}` : String(scoreIR),
            label: `Score IR → ${recomLabel}`,
            color: recomStyle.color,
          },
        ].map((stat) => (
          <div key={stat.label} style={{ background: 'var(--white)', border: '1px solid #eaecee', borderRadius: 10, padding: '12px 14px', textAlign: 'center', boxShadow: 'var(--shadow)' }}>
            <div style={{ fontSize: 22, fontWeight: 500, color: stat.color, marginBottom: 2 }}>{stat.value}</div>
            <div style={{ fontSize: 11, color: 'var(--gray2)' }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* FODA scatter chart: PM (x) vs IR (y) */}
      <FodaScatter factors={factors.filter(f => f.pm !== null)} tipoSoporte={tipoSoporte} />

      {/* Soporte factor decision */}
      {soporteFactor && soporteFactor.pm !== null && (
        <div style={{ background: '#fffbf0', border: '1.5px solid #f0b27a', borderRadius: 10, padding: '18px 20px', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--orange)' }}>Factor dual — decisión requerida</span>
            <span style={{ fontSize: 11, fontFamily: '"DM Mono", monospace', color: 'var(--gray2)', background: '#f2f3f4', padding: '1px 6px', borderRadius: 4 }}>{soporteFactor.factor_codigo}</span>
          </div>
          <p style={{ fontSize: 13, color: 'var(--gray2)', marginBottom: 14, lineHeight: 1.55 }}>
            <strong style={{ color: 'var(--dark)' }}>{soporteFactor.factor_nombre}</strong> puede clasificarse de forma interna o externa según si el soporte proviene de la propia organización o de proveedores / comunidad externos.
          </p>
          <div style={{ display: 'flex', gap: 10 }}>
            {(['interno', 'externo'] as const).map((opt) => {
              const selected = tipoSoporte === opt
              const pm = parseFloat(soporteFactor.pm!)
              const preview = getFodaLiveSoporte(pm, opt)
              const fCfg = FODA_CONFIG[preview as FodaKey] ?? { color: '#888', bg: '#f5f5f5' }
              return (
                <button
                  key={opt}
                  onClick={() => setTipoSoporte(opt)}
                  style={{
                    flex: 1, padding: '12px 16px', borderRadius: 10, cursor: 'pointer',
                    border: `2px solid ${selected ? '#e67e22' : '#d5d8dc'}`,
                    background: selected ? '#fef9e7' : 'var(--white)',
                    textAlign: 'left', transition: 'all 0.18s',
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 600, color: selected ? 'var(--orange)' : 'var(--dark)', marginBottom: 4, textTransform: 'capitalize' }}>
                    {selected ? '◉' : '○'} {opt}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--gray2)', marginBottom: 6 }}>
                    {opt === 'externo' ? 'Soporte de proveedor, comunidad o consultor externo' : 'El soporte lo provee la propia organización'}
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 12, background: fCfg.bg, color: fCfg.color }}>
                    → {preview}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* 4-quadrant FODA grid */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12, marginBottom: 24 }}>
        {(['Fortaleza', 'Oportunidad', 'Debilidad', 'Amenaza'] as const).map((key) => {
          const cfg = FODA_CONFIG[key]
          const items = fodaGroups[key]
          return (
            <div key={key} style={{ background: 'var(--white)', border: `1.5px solid ${cfg.border}`, borderRadius: 12, overflow: 'hidden', boxShadow: 'var(--shadow)' }}>
              {/* Quadrant header */}
              <div style={{
                padding: '11px 14px', background: cfg.bg,
                display: 'flex', alignItems: 'center', gap: 7,
                borderBottom: `1px solid ${cfg.border}`,
              }}>
                {cfg.icon}
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: cfg.color }}>{cfg.label}</div>
                  <div style={{ fontSize: 10.5, color: cfg.color, opacity: 0.7 }}>{cfg.subtitle}</div>
                </div>
                <span style={{ marginLeft: 'auto', fontSize: 18, fontWeight: 600, color: cfg.color, fontFamily: '"DM Mono", monospace' }}>
                  {items.length}
                </span>
              </div>

              {/* Chips */}
              <div style={{ padding: items.length ? '10px 14px 12px' : '14px', display: 'flex', flexWrap: 'wrap', gap: 5, minHeight: 56 }}>
                {items.length === 0 ? (
                  <span style={{ fontSize: 12, color: 'var(--gray2)', fontStyle: 'italic', alignSelf: 'center' }}>
                    Ningún factor en este cuadrante
                  </span>
                ) : (
                  items.map((item) => (
                    <span key={item.nombre} style={{
                      fontSize: 11.5, fontWeight: 500, padding: '4px 10px', borderRadius: 99,
                      background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`,
                      display: 'flex', alignItems: 'center', gap: 5,
                    }}>
                      {item.nombre}
                      <span style={{ fontSize: 10, opacity: 0.7, fontFamily: '"DM Mono", monospace' }}>
                        {item.pm.toFixed(1)}
                      </span>
                    </span>
                  ))
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Info note */}
      <div style={{ background: '#ebf5fb', border: '1px solid #aed6f1', borderRadius: 8, padding: '11px 14px', fontSize: 13, color: 'var(--blue)', display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 24, lineHeight: 1.5 }}>
        <span style={{ fontSize: 15, flexShrink: 0 }}>ℹ</span>
        <span>
          Factores <strong>internos</strong> (dependen de la organización) → Fortaleza/Debilidad.
          Factores <strong>externos</strong> (dependen del software) → Oportunidad/Amenaza. Umbral PM ≥ 3.0 → cuadrante positivo.
        </span>
      </div>

      {/* Footer */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 20, borderTop: '1px solid #eaecee', flexWrap: 'wrap', gap: 12 }}>
        <button
          onClick={() => navigate(`/evaluacion/${evaluacionId}?paso=4`)}
          style={{ background: 'transparent', color: 'var(--gray1)', border: '1.5px solid #d5d8dc', borderRadius: 8, padding: '10px 20px', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--gray4)' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
        >
          ← Paso anterior
        </button>
        <button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending || (!!soporteFactor && tipoSoporte === null)}
          style={{
            background: 'var(--dark)', color: 'var(--white)', border: 'none', borderRadius: 8,
            padding: '11px 26px', fontSize: 14, fontWeight: 500,
            cursor: (saveMutation.isPending || (!!soporteFactor && tipoSoporte === null)) ? 'not-allowed' : 'pointer',
            opacity: (!!soporteFactor && tipoSoporte === null) ? 0.5 : 1,
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--mid)' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--dark)' }}
        >
          {saveMutation.isPending ? 'Finalizando...' : 'Finalizar evaluación →'}
        </button>
      </div>
    </div>
  )
}

function FodaScatter({ factors, tipoSoporte }: {
  factors: Array<{ factor_nombre: string; factor_codigo: string; pm: string | null; importancia_relativa: number | null; factor_tipo_impacto: 'interno' | 'externo'; factor_es_soporte: boolean }>
  tipoSoporte: 'interno' | 'externo' | null
}) {
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string } | null>(null)

  const W = 620, H = 340
  const PAD = { top: 22, right: 24, bottom: 48, left: 48 }
  const chartW = W - PAD.left - PAD.right
  const chartH = H - PAD.top - PAD.bottom

  // Map PM 1-4 and IR 1-4 to pixel coords
  const toX = (pm: number) => PAD.left + ((pm - 1) / 3) * chartW
  const toY = (ir: number) => PAD.top + chartH - ((ir - 1) / 3) * chartH

  const points = factors.map((f) => {
    const pm = parseFloat(f.pm!)
    const ir = f.importancia_relativa ?? 2
    const tipo = f.factor_es_soporte ? (tipoSoporte ?? f.factor_tipo_impacto) : f.factor_tipo_impacto
    const foda = (pm >= 3 ? (tipo === 'interno' ? 'Fortaleza' : 'Oportunidad') : (tipo === 'interno' ? 'Debilidad' : 'Amenaza'))
    return { pm, ir, foda, nombre: f.factor_nombre, codigo: f.factor_codigo }
  })

  const COLORS: Record<string, string> = { Fortaleza: '#27ae60', Oportunidad: '#2980b9', Debilidad: '#e67e22', Amenaza: '#e74c3c' }
  const QUAD_LABELS: Record<string, string> = { Fortaleza: '#1e8449', Oportunidad: '#1a5276', Debilidad: '#784212', Amenaza: '#922b21' }

  return (
    <div style={{ background: 'var(--white)', border: '1px solid #eaecee', borderRadius: 10, padding: '16px 20px', marginBottom: 20 }}>
      <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--gray2)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 12 }}>
        Mapa <GlossaryTerm term="FODA">FODA</GlossaryTerm> — <GlossaryTerm term="PM">PM</GlossaryTerm> vs Importancia relativa (<GlossaryTerm term="IR">IR</GlossaryTerm>)
      </div>
      <div style={{ width: '100%' }}>
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block', overflow: 'visible' }}>
          {/* Quadrant backgrounds */}
          <rect x={PAD.left} y={PAD.top} width={toX(3) - PAD.left} height={chartH / 2} fill="#fef9e7" opacity={0.6} />
          <rect x={toX(3)} y={PAD.top} width={PAD.left + chartW - toX(3)} height={chartH / 2} fill="#eafaf1" opacity={0.6} />
          <rect x={PAD.left} y={PAD.top + chartH / 2} width={toX(3) - PAD.left} height={chartH / 2} fill="#f9ebea" opacity={0.6} />
          <rect x={toX(3)} y={PAD.top + chartH / 2} width={PAD.left + chartW - toX(3)} height={chartH / 2} fill="#ebf5fb" opacity={0.6} />

          {/* Quadrant corner labels */}
          <text x={PAD.left + 6} y={PAD.top + 14} fontSize={10} fill={QUAD_LABELS['Debilidad']} opacity={0.7} fontWeight="600">Debilidad</text>
          <text x={PAD.left + chartW - 6} y={PAD.top + 14} textAnchor="end" fontSize={10} fill={QUAD_LABELS['Fortaleza']} opacity={0.7} fontWeight="600">Fortaleza</text>
          <text x={PAD.left + 6} y={PAD.top + chartH - 6} fontSize={10} fill={QUAD_LABELS['Amenaza']} opacity={0.7} fontWeight="600">Amenaza</text>
          <text x={PAD.left + chartW - 6} y={PAD.top + chartH - 6} textAnchor="end" fontSize={10} fill={QUAD_LABELS['Oportunidad']} opacity={0.7} fontWeight="600">Oportunidad</text>

          {/* Grid lines */}
          {[1, 2, 3, 4].map((v) => (
            <g key={v}>
              <line x1={toX(v)} y1={PAD.top} x2={toX(v)} y2={PAD.top + chartH} stroke="#dde1e7" strokeWidth={1} />
              <line x1={PAD.left} y1={toY(v)} x2={PAD.left + chartW} y2={toY(v)} stroke="#dde1e7" strokeWidth={1} />
            </g>
          ))}

          {/* Threshold line PM=3 */}
          <line x1={toX(3)} y1={PAD.top} x2={toX(3)} y2={PAD.top + chartH} stroke="#566573" strokeWidth={1.5} strokeDasharray="5,4" />
          <text x={toX(3) + 4} y={PAD.top + 10} fontSize={9} fill="#566573">PM=3</text>

          {/* Axis border */}
          <rect x={PAD.left} y={PAD.top} width={chartW} height={chartH} fill="none" stroke="#cdd0d4" strokeWidth={1} />

          {/* Axis labels */}
          <text x={PAD.left + chartW / 2} y={H - 8} textAnchor="middle" fontSize={11} fill="#566573" fontWeight="500">PM (Puntuación media del software) →</text>
          <text x={14} y={PAD.top + chartH / 2} textAnchor="middle" fontSize={11} fill="#566573" fontWeight="500" transform={`rotate(-90, 14, ${PAD.top + chartH / 2})`}>IR (Importancia relativa) →</text>
          {[1, 2, 3, 4].map((v) => (
            <g key={v}>
              <text x={toX(v)} y={PAD.top + chartH + 16} textAnchor="middle" fontSize={10} fill="#909eab">{v}</text>
              <text x={PAD.left - 7} y={toY(v) + 4} textAnchor="end" fontSize={10} fill="#909eab">{v}</text>
            </g>
          ))}

          {/* Data points */}
          {points.map((p, i) => (
            <g key={i}>
              <circle
                cx={toX(p.pm)} cy={toY(p.ir)} r={9}
                fill={COLORS[p.foda] ?? '#888'} opacity={0.88}
                stroke="white" strokeWidth={1.5}
                style={{ cursor: 'pointer' }}
                onMouseEnter={() => {
                  setTooltip({ x: toX(p.pm), y: toY(p.ir) - 24, text: `${p.codigo} · PM=${p.pm.toFixed(1)} IR=${p.ir} → ${p.foda}` })
                }}
                onMouseLeave={() => setTooltip(null)}
              />
              <text x={toX(p.pm)} y={toY(p.ir) - 13} textAnchor="middle" fontSize={9} fill={COLORS[p.foda]} fontWeight="700">{p.codigo}</text>
            </g>
          ))}

          {/* Tooltip */}
          {tooltip && (
            <g>
              <rect x={Math.min(tooltip.x - 6, W - tooltip.text.length * 6 - 10)} y={tooltip.y - 16} width={tooltip.text.length * 6 + 10} height={20} rx={4} fill="rgba(15,39,68,0.88)" />
              <text x={Math.min(tooltip.x - 1, W - tooltip.text.length * 6 - 5)} y={tooltip.y} fontSize={10} fill="white">{tooltip.text}</text>
            </g>
          )}
        </svg>
      </div>
    </div>
  )
}

function LoadingState() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {[1, 2, 3, 4].map((i) => (
        <div key={i} style={{ background: 'var(--white)', border: '1.5px solid #eaecee', borderRadius: 10, height: 80, animation: 'pulse 1.5s ease-in-out infinite' }} />
      ))}
    </div>
  )
}
