import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { evaluacionesApi, type EvaluacionFactor } from '@/api/evaluaciones'
import { useToast } from '@/lib/toast'

const FODA_STYLE: Record<string, { color: string; bg: string }> = {
  Fortaleza: { color: '#27ae60', bg: '#eafaf1' },
  Debilidad: { color: '#e74c3c', bg: '#f9ebea' },
  Oportunidad: { color: '#2980b9', bg: '#ebf5fb' },
  Amenaza: { color: '#e67e22', bg: '#fef9e7' },
}

const REC_STYLE: Record<string, { color: string; bg: string; border: string; label: string }> = {
  'Adoptar': { color: '#1a5e31', bg: '#eafaf1', border: '#a9dfbf', label: 'A — Adoptar el software' },
  'Con condiciones': { color: '#7d5a00', bg: '#fef9e7', border: '#f0c96a', label: 'B — Adoptar con condiciones' },
  'No adoptar': { color: '#7b241c', bg: '#f9ebea', border: '#e6beba', label: 'C — No adoptar el software' },
}

export function Paso6({ evaluacionId }: { evaluacionId: number }) {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { show } = useToast()
  const [downloading, setDownloading] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['paso6', evaluacionId],
    queryFn: () => evaluacionesApi.paso6Get(evaluacionId),
  })

  const handleDownloadPdf = async () => {
    setDownloading(true)
    try {
      const blob = await evaluacionesApi.paso6Pdf(evaluacionId)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `evaluacion-${evaluacionId}.pdf`
      a.click()
      URL.revokeObjectURL(url)
      show('success', 'PDF generado', 'El informe se ha descargado correctamente.')
    } catch (err: unknown) {
      // Axios returns error.response.data as Blob when responseType='blob'
      let detail = 'No se pudo generar el PDF. Revisa la consola del servidor.'
      try {
        const response = (err as { response?: { data?: Blob } }).response
        if (response?.data instanceof Blob) {
          const text = await response.data.text()
          const json = JSON.parse(text)
          if (json?.detail) detail = json.detail
        }
      } catch {
        // keep default detail
      }
      show('error', 'Error al generar el PDF', detail)
    } finally {
      setDownloading(false)
    }
  }

  if (isLoading || !data) return <LoadingState />

  const { evaluacion, factores, foda_counts, score } = data
  const rec = evaluacion.recomendacion || 'Con condiciones'
  const recStyle = REC_STYLE[rec] ?? REC_STYLE['Con condiciones']

  const byFoda: Record<string, EvaluacionFactor[]> = {}
  factores.forEach((f) => {
    if (!byFoda[f.foda]) byFoda[f.foda] = []
    byFoda[f.foda].push(f)
  })

  return (
    <div>
      {/* Hero recommendation */}
      <div style={{
        background: recStyle.bg,
        border: `2px solid ${recStyle.border}`,
        borderRadius: 'var(--radius)',
        padding: '28px 32px',
        textAlign: 'center',
        marginBottom: 28,
      }}>
        <p style={{ fontSize: 12, fontWeight: 600, color: recStyle.color, textTransform: 'uppercase', letterSpacing: '.8px', marginBottom: 10 }}>
          Recomendación GUIOS
        </p>
        <h2 style={{ fontFamily: '"Fraunces", serif', fontSize: 32, fontWeight: 700, color: recStyle.color, marginBottom: 10 }}>
          {recStyle.label}
        </h2>
        <p style={{ fontSize: 14, color: recStyle.color, opacity: 0.8 }}>
          Puntuación FODA: ({foda_counts.Fortaleza} F + {foda_counts.Oportunidad} O) − ({foda_counts.Debilidad} D + {foda_counts.Amenaza} A) ={' '}
          <strong style={{ fontFamily: '"DM Mono", monospace', fontSize: 16 }}>
            {score >= 0 ? '+' : ''}{score}
          </strong>
        </p>
      </div>

      {/* FODA grid */}
      <div style={{ marginBottom: 28 }}>
        <h4 style={{ fontSize: 12, fontWeight: 600, color: 'var(--gray2)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 12 }}>
          Resumen FODA
        </h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {(['Fortaleza', 'Oportunidad', 'Debilidad', 'Amenaza'] as const).map((label) => {
            const style = FODA_STYLE[label]
            const plural = { Fortaleza: 'Fortalezas', Oportunidad: 'Oportunidades', Debilidad: 'Debilidades', Amenaza: 'Amenazas' }[label]
            const items = byFoda[label] || []
            return (
              <div key={label} style={{ background: style.bg, borderRadius: 10, padding: '16px 18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <span style={{ fontFamily: '"Fraunces", serif', fontSize: 28, fontWeight: 700, color: style.color }}>{foda_counts[label as keyof typeof foda_counts]}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: style.color }}>{plural}</span>
                </div>
                {items.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {items.map((f) => (
                      <div key={f.id} style={{ fontSize: 11.5, color: style.color, opacity: 0.85, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontFamily: '"DM Mono", monospace', fontSize: 10, background: 'rgba(255,255,255,0.6)', padding: '1px 5px', borderRadius: 4 }}>{f.factor_codigo}</span>
                        {f.factor_nombre}
                        <span style={{ fontFamily: '"DM Mono", monospace', marginLeft: 'auto', fontSize: 11, fontWeight: 600 }}>{f.pm}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Factor table */}
      <div style={{ marginBottom: 28 }}>
        <h4 style={{ fontSize: 12, fontWeight: 600, color: 'var(--gray2)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 12 }}>
          Detalle por factor ({factores.length} evaluados)
        </h4>
        <div style={{ background: 'var(--white)', border: '1.5px solid #eaecee', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
          {factores.map((f, i) => {
            const pm = f.pm ? parseFloat(f.pm) : null
            const pct = pm !== null ? Math.round(Math.max(0, (pm - 1) / 3) * 100) : 0
            const fstyle = FODA_STYLE[f.foda] ?? { color: '#888', bg: '#f5f5f5' }
            return (
              <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '11px 16px', borderBottom: i < factores.length - 1 ? '1px solid #f2f3f4' : 'none', flexWrap: 'wrap' }}>
                <span style={{ fontSize: 10.5, fontFamily: '"DM Mono", monospace', color: 'var(--gray2)', background: '#f2f3f4', padding: '1px 6px', borderRadius: 4, flexShrink: 0 }}>{f.factor_codigo}</span>
                <span style={{ fontSize: 13, flex: 1, minWidth: 200, color: 'var(--dark)' }}>{f.factor_nombre}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                  <div style={{ width: 80, height: 6, background: '#eaecee', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', background: fstyle.color, width: `${pct}%` }} />
                  </div>
                  <span style={{ fontFamily: '"DM Mono", monospace', fontSize: 12, color: fstyle.color, fontWeight: 600, minWidth: 30 }}>
                    {pm !== null ? pm.toFixed(2) : '—'}
                  </span>
                  <span style={{ fontSize: 11.5, fontWeight: 600, padding: '2px 8px', borderRadius: 12, background: fstyle.bg, color: fstyle.color, minWidth: 80, textAlign: 'center' }}>
                    {f.foda || '—'}
                  </span>
                  {f.factor_es_soporte && (
                    <span style={{ fontSize: 10.5, color: 'var(--blue)', background: '#ebf5fb', padding: '2px 7px', borderRadius: 10, border: '1px solid #aed6f1' }}>
                      {f.soporte ? 'Soporte ext.' : 'Soporte int.'}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Footer actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 20, borderTop: '1px solid #eaecee', flexWrap: 'wrap', gap: 12 }}>
        <button
          onClick={() => {
            qc.invalidateQueries({ queryKey: ['evaluaciones'] })
            navigate('/dashboard')
          }}
          style={{ background: 'transparent', color: 'var(--gray1)', border: '1.5px solid #d5d8dc', borderRadius: 8, padding: '10px 20px', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--gray4)' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
        >
          ← Volver al dashboard
        </button>
        <button
          onClick={handleDownloadPdf}
          disabled={downloading}
          style={{
            background: '#1a5276', color: 'var(--white)', border: 'none', borderRadius: 8,
            padding: '11px 26px', fontSize: 14, fontWeight: 500, cursor: downloading ? 'wait' : 'pointer',
            display: 'flex', alignItems: 'center', gap: 8, opacity: downloading ? 0.7 : 1,
          }}
          onMouseEnter={(e) => { if (!downloading) e.currentTarget.style.background = '#154360' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = '#1a5276' }}
        >
          {downloading ? 'Generando PDF...' : '↓ Descargar PDF'}
        </button>
      </div>
    </div>
  )
}

function LoadingState() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ height: 160, background: '#eafaf1', borderRadius: 'var(--radius)', animation: 'pulse 1.5s ease-in-out infinite' }} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} style={{ height: 80, background: '#eaecee', borderRadius: 10, animation: 'pulse 1.5s ease-in-out infinite' }} />
        ))}
      </div>
    </div>
  )
}
