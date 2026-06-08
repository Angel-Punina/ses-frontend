import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { evaluacionesApi, type EvaluacionSubfactor } from '@/api/evaluaciones'
import { ContextoIAPanel } from './ContextoIAPanel'

const ID_LABELS: Record<number, { label: string; short: string }> = {
  1: { label: 'No cumple', short: 'No' },
  2: { label: 'Sin información', short: 'S/I' },
  3: { label: 'Parcialmente', short: 'Parc.' },
  4: { label: 'Cumple', short: 'Sí' },
}

const SCALE_SELECTED: Record<number, { border: string; bg: string; color: string }> = {
  1: { border: '#922b21', bg: '#f9ebea', color: 'var(--red)' },
  2: { border: '#566573', bg: '#f2f3f4', color: 'var(--gray2)' },
  3: { border: '#e67e22', bg: '#fef9e7', color: 'var(--orange)' },
  4: { border: '#27ae60', bg: '#eafaf1', color: 'var(--green)' },
}

const DIM_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  T: { bg: '#ebf5fb', color: '#1a5276', label: 'Tecnológica' },
  O: { bg: '#eafaf1', color: '#1e8449', label: 'Organizacional' },
  E: { bg: '#fef9e7', color: '#b7770d', label: 'Económica' },
}

function SoftwareInfoBar({ evaluacionId }: { evaluacionId: number }) {
  const { data, isLoading } = useQuery({
    queryKey: ['software-info', evaluacionId],
    queryFn: () => evaluacionesApi.softwareInfo(evaluacionId),
    staleTime: Infinity,
    retry: false,
  })

  if (isLoading) return null
  if (!data?.github && !data?.wikipedia) return null

  const gh = data.github
  const wiki = data.wikipedia

  return (
    <div style={{
      background: 'var(--white)', border: '1.5px solid #d5d8dc', borderRadius: 'var(--radius)',
      padding: '14px 18px', marginBottom: 18, display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'flex-start',
    }}>
      {wiki && (
        <div style={{ flex: '1 1 300px', minWidth: 0 }}>
          <p style={{ fontSize: 12, color: 'var(--gray2)', lineHeight: 1.6, margin: 0 }}>
            <strong style={{ color: 'var(--dark)', fontSize: 13 }}>{wiki.titulo}</strong>{' '}
            — {wiki.resumen.slice(0, 200)}{wiki.resumen.length > 200 ? '…' : ''}
          </p>
          {wiki.url && (
            <a href={wiki.url} target="_blank" rel="noopener noreferrer"
              style={{ fontSize: 11, color: 'var(--light)', marginTop: 4, display: 'inline-block' }}>
              Wikipedia →
            </a>
          )}
        </div>
      )}
      {gh && (
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center', flexShrink: 0 }}>
          {[
            { icon: '★', label: `${gh.estrellas.toLocaleString()} estrellas`, color: '#b7770d' },
            { icon: '⑂', label: `${gh.forks.toLocaleString()} forks`, color: 'var(--gray2)' },
            { icon: '●', label: `${gh.issues_abiertos} issues`, color: gh.issues_abiertos > 100 ? 'var(--orange)' : 'var(--green)' },
            ...(gh.ultimo_push ? [{ icon: '↻', label: `Push: ${gh.ultimo_push}`, color: 'var(--gray2)' }] : []),
            ...(gh.licencia ? [{ icon: '⚖', label: gh.licencia, color: 'var(--gray2)' }] : []),
          ].map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: item.color }}>
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </div>
          ))}
          {gh.url && (
            <a href={gh.url} target="_blank" rel="noopener noreferrer"
              style={{ fontSize: 11, color: 'var(--light)', textDecoration: 'none' }}>
              GitHub →
            </a>
          )}
        </div>
      )}
    </div>
  )
}

export function Paso3({ evaluacionId }: { evaluacionId: number }) {
  const navigate = useNavigate()
  const qc = useQueryClient()

  const { data: subfactors = [], isLoading } = useQuery({
    queryKey: ['paso3', evaluacionId],
    queryFn: () => evaluacionesApi.paso3Get(evaluacionId),
  })

  const [idMap, setIdMap] = useState<Record<number, number>>({})
  const [activeFactor, setActiveFactor] = useState<number | null>(null)

  useEffect(() => {
    if (!subfactors.length) return
    const initial: Record<number, number> = {}
    subfactors.forEach((sf) => {
      if (sf.id_valor) initial[sf.id] = sf.id_valor
    })
    setIdMap(initial)
  }, [subfactors])

  const saveMutation = useMutation({
    mutationFn: (subfactores: { subfactor_id: number; id_valor: number }[]) =>
      evaluacionesApi.paso3Save(evaluacionId, subfactores),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['evaluacion', String(evaluacionId)] })
      qc.invalidateQueries({ queryKey: ['paso4', evaluacionId] })
    },
  })

  const byFactor: Map<number, { meta: EvaluacionSubfactor; items: EvaluacionSubfactor[] }> = new Map()
  subfactors.forEach((sf) => {
    if (!byFactor.has(sf.factor_id)) {
      byFactor.set(sf.factor_id, { meta: sf, items: [] })
    }
    byFactor.get(sf.factor_id)!.items.push(sf)
  })
  const factorList = Array.from(byFactor.values())

  // Set first factor active when data loads
  useEffect(() => {
    if (factorList.length > 0 && activeFactor === null) {
      setActiveFactor(factorList[0].meta.factor_id)
    }
  }, [factorList.length])

  const totalSf = subfactors.length
  const scoredSf = Object.keys(idMap).length
  const pct = totalSf ? Math.round((scoredSf / totalSf) * 100) : 0
  const allSfScored = scoredSf === totalSf && totalSf > 0
  const isIaPrecal = subfactors.length > 0 && subfactors[0]?.ia_sugerida

  const handleSave = () => {
    const payload = Object.entries(idMap).map(([sfId, val]) => ({
      subfactor_id: Number(sfId),
      id_valor: val,
    }))
    saveMutation.mutate(payload, {
      onSuccess: () => navigate(`/evaluacion/${evaluacionId}?paso=4`, { replace: true }),
    })
  }

  if (isLoading) return <LoadingState />

  const activeData = activeFactor !== null ? byFactor.get(activeFactor) ?? null : null

  return (
    <div>
      <div style={{ marginBottom: 18 }}>
        <h3 style={{ fontFamily: '"DM Sans", sans-serif', fontSize: 20, fontWeight: 600, color: 'var(--dark)', marginBottom: 6 }}>
          Paso 3 — Evaluación de subfactores
        </h3>
        <p style={{ color: 'var(--gray2)', fontSize: 13.5, lineHeight: 1.6, maxWidth: 680, margin: 0 }}>
          Para cada subfactor, indica en qué medida el software cumple ese criterio.
          Usa la escala: <strong>1</strong> = No cumple · <strong>2</strong> = Sin información · <strong>3</strong> = Parcialmente · <strong>4</strong> = Cumple.
        </p>
      </div>

      <SoftwareInfoBar evaluacionId={evaluacionId} />

      {isIaPrecal && (
        <div style={{ background: '#f5eef8', border: '1px solid #d2b4de', borderRadius: 8, padding: '11px 14px', fontSize: 13, color: '#6c3483', display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 14, lineHeight: 1.5 }}>
          <span style={{ flexShrink: 0, fontSize: 15 }}>✦</span>
          <span>
            <strong>Precalificación IA aplicada</strong> — los valores de cumplimiento han sido pre-rellenados por Claude basándose en el análisis del software.
            {' '}Revisa y ajusta cada subfactor según tu criterio antes de continuar.
          </span>
        </div>
      )}

      <div style={{ background: '#ebf5fb', border: '1px solid #aed6f1', borderRadius: 8, padding: '11px 14px', fontSize: 13, color: 'var(--blue)', display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 18, lineHeight: 1.5 }}>
        <span style={{ flexShrink: 0, fontSize: 15 }}>ℹ</span>
        <span>
          Subfactores con la etiqueta{' '}
          <span style={{ background: '#eafaf1', color: '#1e8449', fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 8, border: '1px solid #a9dfbf' }}>IA</span>
          {' '}fueron sugeridos por IA a partir de literatura científica reciente (2020-2026).
        </span>
      </div>

      {/* Two-column layout: sidebar + content panel */}
      <div style={{ display: 'grid', gridTemplateColumns: '190px 1fr', border: '1.5px solid #d5d8dc', borderRadius: 12, overflow: 'hidden', background: 'var(--white)', boxShadow: 'var(--shadow)' }}>

        {/* Left sidebar — factor tabs */}
        <div style={{ background: '#fafbfc', borderRight: '1px solid #eaecee', display: 'flex', flexDirection: 'column' }}>
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {factorList.map(({ meta, items }) => {
              const scored = items.filter((sf) => idMap[sf.id] !== undefined).length
              const total = items.length
              const complete = scored === total
              const isActive = activeFactor === meta.factor_id
              const dimStyle = DIM_STYLE[meta.dimension_codigo] ?? DIM_STYLE['T']

              return (
                <button
                  key={meta.factor_id}
                  onClick={() => setActiveFactor(meta.factor_id)}
                  style={{
                    width: '100%', padding: '10px 12px 10px 14px', border: 'none', cursor: 'pointer',
                    textAlign: 'left', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                    background: isActive ? 'var(--white)' : 'transparent',
                    borderLeft: `3px solid ${isActive ? 'var(--dark)' : 'transparent'}`,
                    borderBottom: '1px solid #eaecee',
                    transition: 'background 0.12s',
                  }}
                  onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = 'var(--white)' }}
                  onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2 }}>
                      <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 3, background: dimStyle.bg, color: dimStyle.color }}>
                        {meta.dimension_codigo}
                      </span>
                      <span style={{ fontSize: 10, fontFamily: '"DM Mono", monospace', color: 'var(--gray2)', background: '#f2f3f4', padding: '1px 4px', borderRadius: 3 }}>
                        {meta.factor_codigo}
                      </span>
                    </div>
                    <span style={{ fontSize: 12, color: isActive ? 'var(--dark)' : 'var(--gray2)', fontWeight: isActive ? 500 : 400, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {meta.factor_nombre}
                    </span>
                  </div>
                  <span style={{
                    fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 10, flexShrink: 0,
                    background: complete ? '#eafaf1' : scored > 0 ? '#fef9e7' : '#f2f3f4',
                    color: complete ? '#1e8449' : scored > 0 ? '#b7770d' : 'var(--gray2)',
                    whiteSpace: 'nowrap',
                  }}>
                    {complete ? '✓ ' : ''}{scored}/{total}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Global progress */}
          <div style={{ borderTop: '1px solid #eaecee', padding: '10px 12px' }}>
            <div style={{ fontSize: 10, fontWeight: 500, color: 'var(--gray2)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 5 }}>
              Progreso global
            </div>
            <div style={{ height: 4, background: '#eaecee', borderRadius: 99, overflow: 'hidden', marginBottom: 3 }}>
              <div style={{ height: '100%', background: pct === 100 ? 'var(--green)' : 'var(--light)', borderRadius: 99, width: `${pct}%`, transition: 'width 0.4s' }} />
            </div>
            <div style={{ fontSize: 10, color: 'var(--gray2)' }}>{pct}% completado</div>
          </div>
        </div>

        {/* Right panel — subfactors for active factor */}
        <div style={{ minHeight: 400, display: 'flex', flexDirection: 'column' }}>
          {activeData ? (
            <>
              {/* Factor header */}
              <div style={{ padding: '14px 20px', borderBottom: '1px solid #eaecee', background: 'var(--white)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--dark)' }}>
                    {activeData.meta.factor_nombre}
                  </span>
                  <span style={{ fontSize: 11, fontFamily: '"DM Mono", monospace', color: 'var(--gray2)', background: '#f2f3f4', padding: '1px 6px', borderRadius: 4 }}>
                    {activeData.meta.factor_codigo}
                  </span>
                </div>
                <FactorProgress items={activeData.items} idMap={idMap} />
              </div>

              {/* Subfactor rows */}
              <div style={{ flex: 1 }}>
                {activeData.items.map((sf) => {
                  const selected = idMap[sf.id]
                  const isIa = sf.subfactor_origen === 'ia'
                  return (
                    <div
                      key={sf.id}
                      style={{
                        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
                        gap: 16, padding: '14px 20px', borderBottom: '1px solid #f5f6f7',
                        transition: 'background 0.12s',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = '#fafbfc' }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 10.5, fontFamily: '"DM Mono", monospace', color: 'var(--gray2)', background: '#f2f3f4', padding: '1px 5px', borderRadius: 4 }}>
                            {sf.subfactor_codigo}
                          </span>
                          <strong style={{ fontSize: 13.5, color: 'var(--dark)' }}>{sf.subfactor_nombre}</strong>
                          {isIa && (
                            <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 10, background: '#eafaf1', color: '#1e8449', border: '1px solid #a9dfbf', flexShrink: 0 }}>
                              IA 2020-2026
                            </span>
                          )}
                        </div>
                        {sf.subfactor_descripcion && (
                          <p style={{ fontSize: 12, color: 'var(--gray2)', lineHeight: 1.5, margin: '4px 0 0' }}>
                            {sf.subfactor_descripcion}
                          </p>
                        )}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5, flexShrink: 0 }}>
                        {selected ? (
                          <span style={{ fontSize: 11.5, color: SCALE_SELECTED[selected].color, fontWeight: 500 }}>
                            → {ID_LABELS[selected]?.label}
                          </span>
                        ) : (
                          <span style={{ fontSize: 11.5, color: 'var(--accent)' }}>sin evaluar</span>
                        )}
                        <ScaleGroup
                          value={selected ?? null}
                          onChange={(v) => setIdMap((prev) => ({ ...prev, [sf.id]: v }))}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* AI context panel for this factor */}
              <ContextoIAPanel
                evaluacionId={evaluacionId}
                factorCatalogId={activeData.meta.factor_id}
                factorNombre={activeData.meta.factor_nombre}
              />
            </>
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--gray2)', fontSize: 13 }}>
              Selecciona un factor en la barra lateral
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 24, paddingTop: 20, borderTop: '1px solid #eaecee', flexWrap: 'wrap', gap: 12 }}>
        <span style={{ fontSize: 13, color: 'var(--gray2)' }}>
          {allSfScored
            ? <span style={{ color: 'var(--green)', fontWeight: 500 }}>✓ Todos los subfactores evaluados</span>
            : <span style={{ color: scoredSf > 0 ? 'var(--orange)' : 'var(--gray2)' }}>
                Faltan {totalSf - scoredSf} subfactor{totalSf - scoredSf !== 1 ? 'es' : ''} — debes completar todos antes de continuar
              </span>
          }
        </span>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => navigate(`/evaluacion/${evaluacionId}?paso=2`)}
            style={{ background: 'transparent', color: 'var(--gray1)', border: '1.5px solid #d5d8dc', borderRadius: 8, padding: '10px 20px', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--gray4)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
          >
            ← Paso anterior
          </button>
          <button
            onClick={handleSave}
            disabled={saveMutation.isPending || !allSfScored}
            style={{
              background: 'var(--dark)', color: 'var(--white)', border: 'none', borderRadius: 8,
              padding: '11px 26px', fontSize: 14, fontWeight: 500,
              cursor: !allSfScored || saveMutation.isPending ? 'not-allowed' : 'pointer',
              opacity: !allSfScored ? 0.45 : 1,
            }}
            onMouseEnter={(e) => { if (allSfScored) e.currentTarget.style.background = 'var(--mid)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--dark)' }}
          >
            {saveMutation.isPending ? 'Calculando...' : 'Guardar y continuar →'}
          </button>
        </div>
      </div>
    </div>
  )
}

function FactorProgress({ items, idMap }: { items: EvaluacionSubfactor[]; idMap: Record<number, number> }) {
  const scored = items.filter((sf) => idMap[sf.id] !== undefined).length
  const total = items.length
  const pct = total ? Math.round((scored / total) * 100) : 0
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 4, background: '#eaecee', borderRadius: 99, overflow: 'hidden' }}>
        <div style={{ height: '100%', background: pct === 100 ? 'var(--green)' : 'var(--light)', borderRadius: 99, width: `${pct}%`, transition: 'width 0.4s' }} />
      </div>
      <span style={{ fontSize: 11.5, color: 'var(--gray2)', flexShrink: 0 }}>{scored}/{total}</span>
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
              borderRadius: 7, width: 58, padding: '6px 4px',
              cursor: 'pointer', textAlign: 'center', fontSize: 10.5,
              color: sel ? selStyle!.color : 'var(--gray2)',
              background: sel ? selStyle!.bg : 'var(--white)',
              transition: 'all 0.18s', display: 'flex', flexDirection: 'column',
              alignItems: 'center', gap: 2, flexShrink: 0,
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
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} style={{ background: 'var(--white)', border: '1.5px solid #eaecee', borderRadius: 'var(--radius)', height: 58, animation: 'pulse 1.5s ease-in-out infinite' }} />
      ))}
    </div>
  )
}
