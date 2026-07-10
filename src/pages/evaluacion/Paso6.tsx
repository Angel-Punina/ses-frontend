import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { evaluacionesApi, type Evaluacion, type EvaluacionFactor, type AnalisisRiesgosResponse } from '@/api/evaluaciones'
import { GlossaryTerm } from '@/lib/Tooltip'
import { useToast } from '@/lib/toast'
import { useIsMobile } from '@/lib/useMediaQuery'

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
  const isMobile = useIsMobile()
  const [downloading, setDownloading] = useState(false)
  const [showSavePlantilla, setShowSavePlantilla] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['paso6', evaluacionId],
    queryFn: () => evaluacionesApi.paso6Get(evaluacionId),
  })

  const handleExportJSON = () => {
    if (!data) return
    const { evaluacion, factores, foda_counts, score, score_ponderado } = data
    const exportData = {
      evaluacion: {
        nombre: evaluacion.nombre,
        software: evaluacion.software,
        organizacion: evaluacion.organizacion,
        recomendacion: evaluacion.recomendacion,
        completada: evaluacion.actualizada,
      },
      foda_counts,
      score,
      score_ponderado,
      factores: factores.map((f) => ({
        codigo: f.factor_codigo,
        nombre: f.factor_nombre,
        pm: f.pm,
        foda: f.foda,
        ir: f.importancia_relativa,
      })),
    }
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `evaluacion-${evaluacionId}.json`; a.click()
    URL.revokeObjectURL(url)
  }

  const handleExportCSV = () => {
    if (!data) return
    const { factores } = data
    const header = ['Codigo', 'Factor', 'PM', 'FODA', 'IR']
    const rows = factores.map((f) => [f.factor_codigo, f.factor_nombre, f.pm ?? '', f.foda, String(f.importancia_relativa ?? '')])
    const csv = [header, ...rows].map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `evaluacion-${evaluacionId}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

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

  const { evaluacion, factores, foda_counts, score, score_ponderado } = data
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
        padding: isMobile ? '20px 16px' : '28px 32px',
        textAlign: 'center',
        marginBottom: 28,
      }}>
        <p style={{ fontSize: 12, fontWeight: 600, color: recStyle.color, textTransform: 'uppercase', letterSpacing: '.8px', marginBottom: 10 }}>
          Recomendación <GlossaryTerm term="GUIOS">GUIOS</GlossaryTerm>
        </p>
        <h2 style={{ fontFamily: '"Fraunces", serif', fontSize: 32, fontWeight: 700, color: recStyle.color, marginBottom: 10 }}>
          {recStyle.label}
        </h2>
        <p style={{ fontSize: 14, color: recStyle.color, opacity: 0.8 }}>
          Score <GlossaryTerm term="IR">IR</GlossaryTerm> ponderado:{' '}
          <strong style={{ fontFamily: '"DM Mono", monospace', fontSize: 16 }}>
            {score_ponderado >= 0 ? '+' : ''}{score_ponderado}
          </strong>
          {!isMobile && (
            <span style={{ fontSize: 12, marginLeft: 12, opacity: 0.7 }}>
              (conteo simple: {score >= 0 ? '+' : ''}{score} · F={foda_counts.Fortaleza} O={foda_counts.Oportunidad} D={foda_counts.Debilidad} A={foda_counts.Amenaza})
            </span>
          )}
        </p>
      </div>

      {/* FODA grid */}
      <div style={{ marginBottom: 28 }}>
        <h4 style={{ fontSize: 12, fontWeight: 600, color: 'var(--gray2)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 12 }}>
          Resumen <GlossaryTerm term="FODA">FODA</GlossaryTerm>
        </h4>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 10 }}>
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
        <div style={{ background: 'var(--white)', border: '1.5px solid #eaecee', borderRadius: 'var(--radius)', overflow: 'hidden', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
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

      {/* Risk analysis panel */}
      <RiskPanel evaluacionId={evaluacionId} />

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
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            onClick={() => setShowSavePlantilla(true)}
            style={{ background: 'transparent', color: 'var(--gray1)', border: '1.5px solid #d5d8dc', borderRadius: 8, padding: '10px 16px', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--gray4)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
          >
            ⊞ Guardar como plantilla
          </button>
          <button
            onClick={handleExportCSV}
            style={{ background: 'transparent', color: 'var(--gray1)', border: '1.5px solid #d5d8dc', borderRadius: 8, padding: '10px 16px', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--gray4)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
          >
            ↓ CSV
          </button>
          <button
            onClick={handleExportJSON}
            style={{ background: 'transparent', color: 'var(--gray1)', border: '1.5px solid #d5d8dc', borderRadius: 8, padding: '10px 16px', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--gray4)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
          >
            ↓ JSON
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

      {showSavePlantilla && data && (
        <SavePlantillaModal
          factores={data.factores}
          evaluacion={data.evaluacion}
          onClose={() => setShowSavePlantilla(false)}
          onSaved={() => { setShowSavePlantilla(false); show('success', 'Plantilla guardada', 'La plantilla está disponible al crear nuevas evaluaciones.') }}
        />
      )}
    </div>
  )
}

const TIPO_ORG_OPTS = [
  { value: '', label: 'Tipo de organización (opcional)' },
  { value: 'universidad', label: 'Universidad / Instituto' },
  { value: 'empresa_privada', label: 'Empresa privada' },
  { value: 'empresa_publica', label: 'Empresa / Entidad pública' },
  { value: 'hospital', label: 'Hospital / Centro de salud' },
  { value: 'gobierno', label: 'Organismo de gobierno' },
  { value: 'ong', label: 'ONG / Fundación' },
  { value: 'pyme', label: 'PYME' },
  { value: 'otro', label: 'Otro' },
]

function SavePlantillaModal({ factores, evaluacion, onClose, onSaved }: {
  factores: EvaluacionFactor[]
  evaluacion: Evaluacion
  onClose: () => void
  onSaved: () => void
}) {
  const [nombre, setNombre] = useState(`Plantilla ${evaluacion.software}`)
  const [descripcion, setDescripcion] = useState('')
  const [tipoOrg, setTipoOrg] = useState('')

  const saveMutation = useMutation({
    mutationFn: () => {
      const configuracion_ie: Record<string, number> = {}
      factores.forEach((f) => { if (f.ie !== null) configuracion_ie[String(f.factor)] = f.ie })
      return evaluacionesApi.createPlantilla({
        nombre: nombre.trim(),
        descripcion,
        tipo_organizacion: tipoOrg,
        categoria_software: evaluacion.categoria,
        configuracion_ie,
        publica: false,
      })
    },
    onSuccess: () => onSaved(),
  })

  const inputStyle: React.CSSProperties = {
    width: '100%', border: '1.5px solid #d5d8dc', borderRadius: 8, padding: '10px 13px',
    fontSize: 14, color: 'var(--gray1)', outline: 'none', boxSizing: 'border-box',
  }
  const ieCount = factores.filter((f) => f.ie !== null).length

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(15,39,68,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{ background: 'var(--white)', borderRadius: 16, padding: '28px 32px', width: '100%', maxWidth: 460, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        <h2 style={{ fontFamily: '"Fraunces", serif', fontSize: 19, fontWeight: 700, color: 'var(--dark)', marginBottom: 6 }}>
          Guardar como plantilla
        </h2>
        <p style={{ fontSize: 13, color: 'var(--gray2)', marginBottom: 20, lineHeight: 1.5 }}>
          Guarda los {ieCount} valores IE de esta evaluación como plantilla reutilizable para futuras evaluaciones del mismo tipo.
        </p>

        {saveMutation.isError && (
          <div style={{ background: '#f9ebea', border: '1px solid #e59866', borderRadius: 8, padding: '9px 13px', fontSize: 13, color: 'var(--red)', marginBottom: 14 }}>
            {(saveMutation.error as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? 'Error al guardar la plantilla.'}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 22 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--gray1)' }}>Nombre <span style={{ color: 'var(--accent)' }}>*</span></label>
            <input
              type="text" required value={nombre} onChange={(e) => setNombre(e.target.value)}
              style={inputStyle}
              onFocus={(e) => { e.target.style.borderColor = 'var(--light)' }}
              onBlur={(e) => { e.target.style.borderColor = '#d5d8dc' }}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--gray1)' }}>Descripción <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--gray2)' }}>(opcional)</span></label>
            <textarea
              value={descripcion} onChange={(e) => setDescripcion(e.target.value)}
              rows={2}
              placeholder="Contexto de uso, tipo de organización objetivo..."
              style={{ ...inputStyle, resize: 'vertical' }}
              onFocus={(e) => { e.target.style.borderColor = 'var(--light)' }}
              onBlur={(e) => { e.target.style.borderColor = '#d5d8dc' }}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--gray1)' }}>Tipo de organización</label>
            <select
              value={tipoOrg} onChange={(e) => setTipoOrg(e.target.value)}
              style={{ ...inputStyle, cursor: 'pointer', appearance: 'none' }}
            >
              {TIPO_ORG_OPTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{ background: 'transparent', color: 'var(--gray1)', border: '1.5px solid #d5d8dc', borderRadius: 8, padding: '10px 20px', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--gray4)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
          >Cancelar</button>
          <button
            onClick={() => saveMutation.mutate()}
            disabled={!nombre.trim() || saveMutation.isPending}
            style={{ background: 'var(--dark)', color: 'var(--white)', border: 'none', borderRadius: 8, padding: '11px 22px', fontSize: 14, fontWeight: 500, cursor: !nombre.trim() || saveMutation.isPending ? 'not-allowed' : 'pointer', opacity: saveMutation.isPending ? 0.7 : 1 }}
            onMouseEnter={(e) => { if (nombre.trim()) e.currentTarget.style.background = 'var(--mid)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--dark)' }}
          >{saveMutation.isPending ? 'Guardando...' : 'Guardar plantilla'}</button>
        </div>
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

const RISK_SEV: Record<string, { color: string; bg: string; border: string; label: string }> = {
  alta:  { color: '#922b21', bg: '#f9ebea', border: '#e6beba', label: 'Alta' },
  media: { color: '#7d5a00', bg: '#fef9e7', border: '#f0c96a', label: 'Media' },
  baja:  { color: '#1e8449', bg: '#eafaf1', border: '#a9dfbf', label: 'Baja' },
}

function RiskPanel({ evaluacionId }: { evaluacionId: number }) {
  const [open, setOpen] = useState(false)
  const { data, isLoading, isError } = useQuery<AnalisisRiesgosResponse>({
    queryKey: ['riesgos', evaluacionId],
    queryFn: () => evaluacionesApi.analizarRiesgos(evaluacionId),
    enabled: open,
    staleTime: 5 * 60 * 1000,
  })

  return (
    <div style={{ marginBottom: 28, border: '1.5px solid #d5d8dc', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 18px', background: open ? '#fafbfc' : 'var(--white)', border: 'none',
          cursor: 'pointer', gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 15 }}>⚠</span>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--dark)' }}>Análisis de riesgos y oportunidades (IA)</span>
          {data && !isLoading && (
            <span style={{ fontSize: 11, background: '#f9ebea', color: '#922b21', padding: '2px 8px', borderRadius: 10, border: '1px solid #e6beba' }}>
              {data.riesgos.length} riesgos
            </span>
          )}
          {data && !isLoading && (
            <span style={{ fontSize: 11, background: '#eafaf1', color: '#1e8449', padding: '2px 8px', borderRadius: 10, border: '1px solid #a9dfbf' }}>
              {data.oportunidades.length} oportunidades
            </span>
          )}
        </div>
        <span style={{ fontSize: 12, color: 'var(--gray2)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▼</span>
      </button>

      {open && (
        <div style={{ borderTop: '1px solid #eaecee', padding: '18px 20px' }}>
          {isLoading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[1, 2, 3].map((i) => (
                <div key={i} style={{ height: 56, background: '#eaecee', borderRadius: 8, animation: 'pulse 1.5s ease-in-out infinite' }} />
              ))}
            </div>
          )}
          {isError && (
            <p style={{ fontSize: 13, color: 'var(--gray2)', textAlign: 'center', padding: '20px 0' }}>
              No se pudo obtener el análisis. Intenta nuevamente más tarde.
            </p>
          )}
          {data && (
            <>
              {data.resumen_ejecutivo && (
                <div style={{ background: '#ebf5fb', border: '1px solid #aed6f1', borderRadius: 8, padding: '12px 14px', marginBottom: 18 }}>
                  <p style={{ fontSize: 13.5, color: '#1a5276', lineHeight: 1.6, margin: 0 }}>{data.resumen_ejecutivo}</p>
                </div>
              )}

              {data.riesgos.length > 0 && (
                <div style={{ marginBottom: 18 }}>
                  <h5 style={{ fontSize: 12, fontWeight: 600, color: 'var(--gray2)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 10 }}>
                    Riesgos de adopción
                  </h5>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {data.riesgos.map((r, i) => {
                      const sev = RISK_SEV[r.severidad] ?? RISK_SEV.media
                      return (
                        <div key={i} style={{ border: `1px solid ${sev.border}`, borderRadius: 8, padding: '10px 14px', background: sev.bg }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                            <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 10, background: 'rgba(255,255,255,0.7)', color: sev.color, border: `1px solid ${sev.border}` }}>
                              {sev.label}
                            </span>
                            <span style={{ fontSize: 12, fontFamily: '"DM Mono", monospace', color: sev.color, fontWeight: 600 }}>{r.factor}</span>
                          </div>
                          <p style={{ fontSize: 13, color: sev.color, margin: '0 0 4px', lineHeight: 1.5 }}>{r.descripcion}</p>
                          {r.mitigacion && (
                            <p style={{ fontSize: 12, color: sev.color, opacity: 0.8, margin: 0, lineHeight: 1.4 }}>
                              Mitigación: {r.mitigacion}
                            </p>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {data.oportunidades.length > 0 && (
                <div>
                  <h5 style={{ fontSize: 12, fontWeight: 600, color: 'var(--gray2)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 10 }}>
                    Oportunidades
                  </h5>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {data.oportunidades.map((o, i) => (
                      <div key={i} style={{ display: 'flex', gap: 10, padding: '9px 12px', background: '#eafaf1', borderRadius: 8, border: '1px solid #a9dfbf' }}>
                        <span style={{ fontSize: 10, fontFamily: '"DM Mono", monospace', color: '#1e8449', background: 'rgba(255,255,255,0.6)', padding: '2px 6px', borderRadius: 4, flexShrink: 0, alignSelf: 'flex-start', marginTop: 1 }}>
                          {o.factor}
                        </span>
                        <p style={{ fontSize: 13, color: '#1e8449', margin: 0, lineHeight: 1.5 }}>{o.descripcion}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
