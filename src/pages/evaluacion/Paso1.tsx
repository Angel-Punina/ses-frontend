import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { evaluacionesApi, type EvaluacionFactor, type IaContextoResponse, CATEGORIAS } from '@/api/evaluaciones'
import { GlossaryTerm } from '@/lib/Tooltip'
import { useIsMobile } from '@/lib/useMediaQuery'

const ID_LABELS: Record<number, { label: string; short: string }> = {
  1: { label: 'Irrelevante', short: 'Irrel.' },
  2: { label: 'Opcional', short: 'Opc.' },
  3: { label: 'Importante', short: 'Imp.' },
  4: { label: 'Fundamental', short: 'Fund.' },
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

// Matrix Figura 5.10 (tesis Rea Sánchez 2022) — identical for IS and IR
const MATRIX: Record<number, Record<number, number>> = {
  1: { 1: 1, 2: 1, 3: 2, 4: 2 },
  2: { 1: 1, 2: 2, 3: 2, 4: 3 },
  3: { 1: 2, 2: 2, 3: 3, 4: 3 },
  4: { 1: 2, 2: 3, 3: 3, 4: 4 },
}

function computeIR(id: number, is: number): number {
  return MATRIX[id]?.[is] ?? 1
}

export function Paso1({ evaluacionId, usarPlantilla = false }: { evaluacionId: number; usarPlantilla?: boolean }) {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const isMobile = useIsMobile()

  const { data: factors = [], isLoading } = useQuery({
    queryKey: ['paso1', evaluacionId],
    queryFn: () => evaluacionesApi.paso1Get(evaluacionId),
  })

  // ie values: factor_id → value
  const [ieMap, setIeMap] = useState<Record<number, number>>({})
  // open accordions
  const [openDims, setOpenDims] = useState<Record<string, boolean>>({ T: true, O: false, E: false })
  // plantilla panel
  const [showPlantillasPanel, setShowPlantillasPanel] = useState(false)
  const [selectedPlantillaId, setSelectedPlantillaId] = useState<number | null>(null)
  const [plantillaApplied, setPlantillaApplied] = useState(false)
  // IA context: catalog factor id or null
  const [openIaCtx, setOpenIaCtx] = useState<number | null>(null)

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

  const { data: plantillasList = [] } = useQuery({
    queryKey: ['plantillas'],
    queryFn: evaluacionesApi.plantillas,
    enabled: showPlantillasPanel,
    staleTime: 5 * 60 * 1000,
  })

  const aplicarPlantillaMutation = useMutation({
    mutationFn: (plantillaId: number) => evaluacionesApi.aplicarPlantilla(evaluacionId, plantillaId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['paso1', evaluacionId] })
      setShowPlantillasPanel(false)
      setSelectedPlantillaId(null)
      setPlantillaApplied(true)
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
          <div>
            <strong>Precalificación IA aplicada</strong> — La IA analizó el contexto de tu evaluación y pre-sugerió los valores de importancia. Revisa y ajusta según tu criterio antes de continuar.
          </div>
        </div>
      )}

      {/* Applied plantilla success banner */}
      {plantillaApplied && (
        <div style={{ background: '#eafaf1', border: '1px solid #a9dfbf', borderRadius: 8, padding: '11px 14px', fontSize: 13, color: '#1e8449', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <span style={{ fontSize: 16 }}>✓</span>
          <span>Plantilla aplicada — los valores de importancia (ID) han sido cargados. Revisa y ajusta según tu criterio.</span>
          <button onClick={() => setPlantillaApplied(false)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#1e8449', fontSize: 14, padding: '2px 4px' }}>✕</button>
        </div>
      )}

      {/* Plantilla panel — only when evaluation was created with usar_plantilla=true */}
      {usarPlantilla && <div style={{ border: `1.5px solid ${showPlantillasPanel ? '#aed6f1' : '#d5d8dc'}`, borderRadius: 10, marginBottom: 16, overflow: 'hidden', background: showPlantillasPanel ? '#ebf5fb' : '#fafbfc' }}>
        <button
          type="button"
          onClick={() => { setShowPlantillasPanel(!showPlantillasPanel); setSelectedPlantillaId(null) }}
          style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
        >
          <span style={{ fontSize: 14, color: showPlantillasPanel ? 'var(--blue)' : 'var(--gray2)' }}>◫</span>
          <div style={{ flex: 1 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: showPlantillasPanel ? '#1a5276' : 'var(--dark)' }}>Aplicar plantilla</span>
            <span style={{ fontSize: 11.5, color: 'var(--gray2)', marginLeft: 8 }}>Pre-carga valores IE desde una plantilla guardada</span>
          </div>
          <span style={{ fontSize: 12, color: 'var(--gray2)', transform: showPlantillasPanel ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>⌄</span>
        </button>
        {showPlantillasPanel && (
          <div style={{ borderTop: '1px solid #d6eaf8', padding: '12px 14px' }}>
            {plantillasList.length === 0 ? (
              <p style={{ fontSize: 12.5, color: 'var(--gray2)', margin: 0 }}>No hay plantillas disponibles. Guarda una desde el Paso 6 de una evaluación completada.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {plantillasList.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedPlantillaId(p.id === selectedPlantillaId ? null : p.id)}
                    style={{
                      display: 'flex', alignItems: 'flex-start', gap: 10, padding: '9px 12px', borderRadius: 8,
                      border: `1.5px solid ${selectedPlantillaId === p.id ? '#2980b9' : '#d5d8dc'}`,
                      background: selectedPlantillaId === p.id ? '#ebf5fb' : 'var(--white)', cursor: 'pointer', textAlign: 'left',
                    }}
                  >
                    <div style={{ width: 16, height: 16, borderRadius: '50%', border: `2px solid ${selectedPlantillaId === p.id ? '#2980b9' : '#d5d8dc'}`, background: selectedPlantillaId === p.id ? '#2980b9' : 'transparent', flexShrink: 0, marginTop: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {selectedPlantillaId === p.id && <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'white' }} />}
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--dark)' }}>{p.nombre}</div>
                      <div style={{ display: 'flex', gap: 5, marginTop: 3, flexWrap: 'wrap' }}>
                        {p.tipo_organizacion && <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 10, background: '#f2f3f4', color: 'var(--gray2)' }}>{p.tipo_organizacion}</span>}
                        {p.categoria_software && <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 10, background: '#ebf5fb', color: 'var(--blue)' }}>{CATEGORIAS.find((c) => c.value === p.categoria_software)?.label ?? p.categoria_software}</span>}
                        <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 10, background: '#fef9e7', color: 'var(--orange)' }}>{Object.keys(p.configuracion_ie).length} factores IE</span>
                      </div>
                    </div>
                  </button>
                ))}
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
                  <button
                    onClick={() => selectedPlantillaId && aplicarPlantillaMutation.mutate(selectedPlantillaId)}
                    disabled={!selectedPlantillaId || aplicarPlantillaMutation.isPending}
                    style={{
                      background: !selectedPlantillaId ? '#d5d8dc' : 'var(--dark)', color: 'var(--white)', border: 'none',
                      borderRadius: 8, padding: '9px 18px', fontSize: 13, fontWeight: 500,
                      cursor: !selectedPlantillaId || aplicarPlantillaMutation.isPending ? 'not-allowed' : 'pointer',
                      opacity: aplicarPlantillaMutation.isPending ? 0.7 : 1,
                    }}
                  >
                    {aplicarPlantillaMutation.isPending ? 'Aplicando...' : 'Aplicar plantilla seleccionada →'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>}

      {/* Info box */}
      <div style={{ background: '#ebf5fb', border: '1px solid #aed6f1', borderRadius: 8, padding: isMobile ? '10px 12px' : '12px 14px', fontSize: 13, color: 'var(--blue)', display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 20, lineHeight: 1.5 }}>
        <span style={{ fontSize: 16, flexShrink: 0 }}>ℹ</span>
        <span>
          Valora del <strong>1 (Irrelevante)</strong> al <strong>4 (Fundamental)</strong>.{' '}
          El <GlossaryTerm term="IS">IS</GlossaryTerm> (Importancia Sugerida) está predefinido por la metodología <GlossaryTerm term="GUIOS">GUIOS</GlossaryTerm>.{' '}
          Si asignas <GlossaryTerm term="ID">ID</GlossaryTerm>=1 (Irrelevante) a un factor con <GlossaryTerm term="IS">IS</GlossaryTerm>=1 o IS=2,
          ese factor quedará excluido automáticamente (<GlossaryTerm term="IR">IR</GlossaryTerm>=1).
        </span>
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
                    const ir = selected != null ? computeIR(selected, f.factor_is) : null
                    const irExcluido = ir === 1
                    return (
                      <div key={f.factor} style={{ borderBottom: '1px solid #f2f3f4' }}>
                        <div style={{
                          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
                          gap: 18, padding: '16px 20px', transition: 'background 0.15s', flexWrap: 'wrap',
                          background: irExcluido ? 'rgba(146,43,33,0.03)' : 'transparent',
                        }}
                          onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = irExcluido ? 'rgba(146,43,33,0.05)' : '#fafbfc' }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = irExcluido ? 'rgba(146,43,33,0.03)' : 'transparent' }}
                        >
                          <div style={{ flex: 1, minWidth: 260 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3, flexWrap: 'wrap' }}>
                              <span style={{ fontSize: 11, fontFamily: '"DM Mono", monospace', color: 'var(--gray2)', background: '#f2f3f4', padding: '1px 6px', borderRadius: 4 }}>{f.factor_codigo}</span>
                              <strong style={{ fontSize: 14, color: irExcluido ? 'var(--gray2)' : 'var(--dark)', textDecoration: irExcluido ? 'line-through' : 'none' }}>{f.factor_nombre}</strong>
                              <button
                                onClick={() => setOpenIaCtx(openIaCtx === f.factor ? null : f.factor)}
                                title="Ver contexto de investigación IA"
                                style={{
                                  background: openIaCtx === f.factor ? '#e8f8f5' : 'transparent',
                                  border: `1px solid ${openIaCtx === f.factor ? '#a2d9ce' : '#d5d8dc'}`,
                                  borderRadius: 6, padding: '2px 8px', fontSize: 11, cursor: 'pointer',
                                  color: openIaCtx === f.factor ? '#0e6655' : 'var(--gray2)',
                                  display: 'flex', alignItems: 'center', gap: 4,
                                }}
                                onMouseEnter={(e) => { if (openIaCtx !== f.factor) { e.currentTarget.style.background = '#e8f8f5'; e.currentTarget.style.color = '#0e6655'; e.currentTarget.style.borderColor = '#a2d9ce' } }}
                                onMouseLeave={(e) => { if (openIaCtx !== f.factor) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--gray2)'; e.currentTarget.style.borderColor = '#d5d8dc' } }}
                              >
                                ⊕ IA
                              </button>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                              <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 12, background: dimStyle.bg, color: dimStyle.color }}>{dim}</span>
                              <span style={{ fontSize: 11.5, color: 'var(--gray2)' }}>
                                <GlossaryTerm term="IS">IS</GlossaryTerm>=<strong style={{ fontFamily: '"DM Mono", monospace', color: 'var(--blue)' }}>{f.factor_is}</strong>
                              </span>
                              {ir != null && (
                                <span
                                  title={`IS=${f.factor_is} × ID=${selected} → IR=${ir}${irExcluido ? ' — este factor quedará EXCLUIDO' : ''}`}
                                  style={{
                                    fontSize: 11, fontFamily: '"DM Mono", monospace',
                                    padding: '2px 8px', borderRadius: 12, fontWeight: 600,
                                    background: irExcluido ? '#f9ebea' : ir >= 3 ? '#eafaf1' : '#fef9e7',
                                    color: irExcluido ? 'var(--red)' : ir >= 3 ? 'var(--green)' : 'var(--orange)',
                                    border: `1px solid ${irExcluido ? 'rgba(146,43,33,0.3)' : ir >= 3 ? '#a9dfbf' : '#f0b27a'}`,
                                  }}
                                >
                                  <GlossaryTerm term="IR">IR</GlossaryTerm>={ir}{irExcluido ? ' — excluido' : ''}
                                </span>
                              )}
                            </div>
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
                            <span style={{ fontSize: 11.5, color: 'var(--gray2)' }}>
                              <GlossaryTerm term="ID">ID</GlossaryTerm> organización {selected ? <strong style={{ color: 'var(--dark)' }}>→ {ID_LABELS[selected]?.short}</strong> : <span style={{ color: 'var(--accent)' }}>sin valorar</span>}
                            </span>
                            <ScaleGroup
                              value={selected ?? null}
                              onChange={(v) => setIeMap({ ...ieMap, [f.factor]: v })}
                            />
                          </div>
                        </div>
                        {openIaCtx === f.factor && (
                          <div style={{ padding: '0 20px 16px' }}>
                            <IaContextPanel evaluacionId={evaluacionId} factorId={f.factor} />
                          </div>
                        )}
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

function IaContextPanel({ evaluacionId, factorId }: { evaluacionId: number; factorId: number }) {
  const { data, isLoading, isError } = useQuery<IaContextoResponse>({
    queryKey: ['ia-contexto', evaluacionId, factorId],
    queryFn: () => evaluacionesApi.iaContexto(evaluacionId, factorId),
    staleTime: 30 * 60 * 1000,
    retry: 1,
  })

  return (
    <div style={{ background: '#f0faf7', border: '1.5px solid #a2d9ce', borderRadius: 10, padding: '14px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: data ? 10 : 4 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#0e6655', textTransform: 'uppercase', letterSpacing: '.05em' }}>Contexto de investigación IA</span>
        {data?.cache_hit && <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 99, background: '#eafaf1', color: '#1e8449', border: '1px solid #a9dfbf' }}>caché</span>}
      </div>

      {isLoading && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: '#0e6655' }}>
          <div style={{ width: 14, height: 14, border: '2px solid #a2d9ce', borderTopColor: '#0e6655', borderRadius: '50%', animation: 'spin 0.8s linear infinite', flexShrink: 0 }} />
          Consultando literatura académica 2020-2026...
        </div>
      )}

      {isError && (
        <div style={{ fontSize: 12.5, color: 'var(--gray2)' }}>
          No se pudo obtener el contexto IA para este factor. Continúa con tu criterio profesional.
        </div>
      )}

      {data && !data.error && (
        <>
          <p style={{ fontSize: 13, color: 'var(--dark)', lineHeight: 1.65, margin: '0 0 10px' }}>{data.resumen}</p>
          {data.fuentes.length > 0 && (
            <div>
              <div style={{ fontSize: 10.5, fontWeight: 600, color: '#1a8072', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 6 }}>
                Fuentes ({data.fuentes.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {data.fuentes.slice(0, 4).map((f, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'baseline', gap: 8, fontSize: 11.5, color: 'var(--gray2)' }}>
                    <span style={{ color: '#a2d9ce', flexShrink: 0 }}>›</span>
                    <span>
                      <span style={{ color: 'var(--dark)', fontWeight: 500 }}>{f.titulo}</span>
                      {f.anio && <span style={{ marginLeft: 5, color: '#1a8072', fontFamily: '"DM Mono", monospace' }}>({f.anio})</span>}
                      {f.citas > 0 && <span style={{ marginLeft: 5, color: 'var(--gray3)' }}>{f.citas} citas</span>}
                    </span>
                  </div>
                ))}
                {data.fuentes.length > 4 && (
                  <span style={{ fontSize: 11, color: 'var(--gray3)', marginLeft: 14 }}>+{data.fuentes.length - 4} fuentes más</span>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {data?.error && (
        <div style={{ fontSize: 12.5, color: 'var(--gray2)' }}>
          {data.error}
        </div>
      )}
    </div>
  )
}

function ScaleGroup({ value, onChange }: { value: number | null; onChange: (v: number) => void }) {
  const isMobile = useIsMobile()
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
              borderRadius: 7, width: isMobile ? 52 : 68, padding: '6px 4px',
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
