import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { evaluacionesApi } from '@/api/evaluaciones'

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
      navigate(`/evaluacion/${evaluacionId}?paso=6`, { replace: true })
    },
  })

  const soporteFactor = factors.find((f) => f.factor_es_soporte)

  // Compute live FODA assignments
  type FodaKey = 'Fortaleza' | 'Oportunidad' | 'Debilidad' | 'Amenaza'
  const fodaGroups: Record<FodaKey, Array<{ nombre: string; pm: number }>> = {
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
      fodaGroups[foda as FodaKey].push({ nombre: f.factor_nombre, pm })
    }
  })

  const positivos = fodaGroups.Fortaleza.length + fodaGroups.Oportunidad.length
  const negativos = fodaGroups.Debilidad.length + fodaGroups.Amenaza.length
  const balance = positivos - negativos
  const recomLabel = balance >= 2 ? 'A — Adoptar' : balance >= -1 ? 'B — Con condiciones' : 'C — No adoptar'
  const recomStyle = balance >= 2
    ? { color: 'var(--green)', bg: '#eafaf1' }
    : balance >= -1
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
          El sistema clasificó cada factor usando: PM ≥ 3 + interno = Fortaleza · PM ≥ 3 + externo = Oportunidad · PM &lt; 3 + interno = Debilidad · PM &lt; 3 + externo = Amenaza.
        </p>
      </div>

      {/* Summary stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 20 }}>
        {[
          { value: positivos, label: 'Positivos (F + O)', color: '#27ae60' },
          { value: negativos, label: 'Negativos (D + A)', color: '#e74c3c' },
          {
            value: balance >= 0 ? `+${balance}` : String(balance),
            label: `Balance → ${recomLabel}`,
            color: recomStyle.color,
          },
        ].map((stat) => (
          <div key={stat.label} style={{ background: 'var(--white)', border: '1px solid #eaecee', borderRadius: 10, padding: '12px 14px', textAlign: 'center', boxShadow: 'var(--shadow)' }}>
            <div style={{ fontSize: 22, fontWeight: 500, color: stat.color, marginBottom: 2 }}>{stat.value}</div>
            <div style={{ fontSize: 11, color: 'var(--gray2)' }}>{stat.label}</div>
          </div>
        ))}
      </div>

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
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
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

function LoadingState() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {[1, 2, 3, 4].map((i) => (
        <div key={i} style={{ background: 'var(--white)', border: '1.5px solid #eaecee', borderRadius: 10, height: 80, animation: 'pulse 1.5s ease-in-out infinite' }} />
      ))}
    </div>
  )
}
