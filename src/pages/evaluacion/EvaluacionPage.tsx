import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useIsMobile } from '@/lib/useMediaQuery'
import { evaluacionesApi, type SoftwareInfo } from '@/api/evaluaciones'
import { Paso1 } from './Paso1'
import { Paso2 } from './Paso2'
import { Paso3 } from './Paso3'
import { Paso4 } from './Paso4'
import { Paso5 } from './Paso5'
import { Paso6 } from './Paso6'

const STEPS = [
  { num: 1, label: 'Importancia' },
  { num: 2, label: 'Relevancia' },
  { num: 3, label: 'Evaluación' },
  { num: 4, label: 'Ponderación' },
  { num: 5, label: 'FODA' },
  { num: 6, label: 'Resultado' },
]

const ESTADO_TO_PASO: Record<string, number> = {
  borrador: 1,
  paso1: 1,
  paso2: 2,
  paso3: 3,
  paso4: 4,
  paso5: 5,
  completada: 6,
}

export function EvaluacionPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const pasoOverride = searchParams.get('paso') ? Number(searchParams.get('paso')) : null
  const [showShare, setShowShare] = useState(false)
  const [showHistorial, setShowHistorial] = useState(false)
  const [showSoftwareInfo, setShowSoftwareInfo] = useState(false)
  const isMobile = useIsMobile()

  const { data: evaluacion, isLoading, error } = useQuery({
    queryKey: ['evaluacion', id],
    queryFn: () => evaluacionesApi.get(Number(id)),
    enabled: !!id,
  })

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--bg)' }}>
        <span style={{ color: 'var(--gray2)', fontSize: 14 }}>Cargando evaluación...</span>
      </div>
    )
  }

  if (error || !evaluacion) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--bg)', gap: 16 }}>
        <span style={{ color: 'var(--red)', fontSize: 14 }}>No se pudo cargar la evaluación.</span>
        <button onClick={() => navigate('/dashboard')} style={btnGhostStyle}>Volver al dashboard</button>
      </div>
    )
  }

  const pasoActual = pasoOverride ?? ESTADO_TO_PASO[evaluacion.estado] ?? 1

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      {/* ── Top bar ── */}
      <div style={{
        background: 'var(--white)', borderBottom: '1px solid rgba(0,0,0,0.07)',
        padding: isMobile ? '0 12px' : '0 32px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        height: 56, flexShrink: 0, position: 'sticky', top: 0, zIndex: 50,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={() => navigate('/dashboard')}
            style={{ width: 34, height: 34, borderRadius: 8, border: '1.5px solid #d5d8dc', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--gray2)', background: 'transparent', fontSize: 16 }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--gray4)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
          >←</button>
          <div style={{ minWidth: 0 }}>
            <span style={{ fontFamily: '"DM Sans", sans-serif', fontSize: 16, fontWeight: 600, color: 'var(--dark)', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: isMobile ? 160 : 400 }}>
              {evaluacion.nombre}
            </span>
            <span style={{ fontSize: 12, color: 'var(--gray2)' }}>
              {evaluacion.software}
              {!isMobile && (
                <>
                  <span style={{ margin: '0 5px', opacity: 0.4 }}>·</span>
                  <span style={{ color: 'var(--light)', fontWeight: 500 }}>
                    Paso {pasoActual} — {STEPS.find(s => s.num === pasoActual)?.label}
                  </span>
                </>
              )}
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--green)' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)', display: 'inline-block', flexShrink: 0 }} />
            {!isMobile && (
              <span title={new Date(evaluacion.actualizada).toLocaleString('es-EC')}>
                Guardado {_relTime(evaluacion.actualizada)}
              </span>
            )}
          </div>
          {!isMobile && (
            <button
              onClick={() => setShowHistorial(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', border: '1.5px solid #d5d8dc', borderRadius: 8, padding: '6px 12px', fontSize: 13, color: 'var(--gray1)', cursor: 'pointer' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--gray4)' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
            >⊙ Historial</button>
          )}
          <button
            onClick={() => setShowSoftwareInfo(true)}
            title={`Info sobre ${evaluacion.software}`}
            style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'transparent', border: '1.5px solid #d5d8dc', borderRadius: 8, padding: '6px 12px', fontSize: 13, color: 'var(--gray1)', cursor: 'pointer' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--gray4)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
          >ⓘ {!isMobile && evaluacion.software}</button>
          <button
            onClick={() => setShowShare(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', border: '1.5px solid #d5d8dc', borderRadius: 8, padding: '6px 14px', fontSize: 13, color: 'var(--gray1)', cursor: 'pointer' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--gray4)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
          >⤴{!isMobile && ' Compartir'}</button>
        </div>
      </div>

      {showShare && evaluacion && (
        <ShareModal
          evaluacionId={Number(id)}
          evaluacionNombre={evaluacion.nombre}
          onClose={() => setShowShare(false)}
        />
      )}
      {showHistorial && (
        <HistorialModal
          evaluacionId={Number(id)}
          onClose={() => setShowHistorial(false)}
        />
      )}
      {showSoftwareInfo && evaluacion && (
        <SoftwareInfoModal
          evaluacionId={Number(id)}
          software={evaluacion.software}
          onClose={() => setShowSoftwareInfo(false)}
        />
      )}

      {/* ── Stepper ── */}
      <div style={{
        background: 'var(--white)', borderBottom: '1px solid rgba(0,0,0,0.06)',
        padding: isMobile ? '10px 12px 0' : '14px 32px 0', display: 'flex', alignItems: 'center', gap: 8, overflowX: 'auto',
      }}>
        {STEPS.map((step, i) => {
          const done = step.num < pasoActual
          const active = step.num === pasoActual
          return (
            <div key={step.num} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, minWidth: isMobile ? 52 : 68, paddingBottom: 14 }}>
                <div style={{
                  width: isMobile ? 28 : 32, height: isMobile ? 28 : 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, fontWeight: 600, transition: 'all 0.2s',
                  background: done ? 'var(--green)' : active ? 'var(--dark)' : 'var(--white)',
                  border: done ? '2px solid var(--green)' : active ? '2px solid var(--dark)' : '2px solid #d5d8dc',
                  color: done || active ? 'var(--white)' : 'var(--gray2)',
                  boxShadow: active ? '0 0 0 4px rgba(15,39,68,0.12)' : 'none',
                }}>
                  {done ? '✓' : step.num}
                </div>
                <span style={{
                  fontSize: 11.5, whiteSpace: 'nowrap',
                  color: done ? 'var(--green)' : active ? 'var(--dark)' : 'var(--gray2)',
                  fontWeight: active ? 600 : 400,
                }}>
                  {step.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div style={{ width: isMobile ? 20 : 40, height: 2, background: done ? 'var(--green)' : '#eaecee', borderRadius: 2, marginBottom: 18, flexShrink: 0 }} />
              )}
            </div>
          )
        })}
      </div>

      {/* ── Content ── */}
      <div style={{ flex: 1, padding: isMobile ? '16px' : '24px 32px', maxWidth: 1100, width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>
        {pasoActual === 1 && <Paso1 evaluacionId={Number(id)} usarPlantilla={evaluacion.usar_plantilla ?? false} />}
        {pasoActual === 2 && <Paso2 evaluacionId={Number(id)} />}
        {pasoActual === 3 && <Paso3 evaluacionId={Number(id)} />}
        {pasoActual === 4 && <Paso4 evaluacionId={Number(id)} />}
        {pasoActual === 5 && <Paso5 evaluacionId={Number(id)} />}
        {pasoActual === 6 && <Paso6 evaluacionId={Number(id)} />}
      </div>
    </div>
  )
}

function _relTime(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 60) return 'hace un momento'
  if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)} h`
  return `hace ${Math.floor(diff / 86400)} días`
}

const PASO_LABELS: Record<string, string> = {
  paso1: 'Paso 1 — Importancia estratégica',
  paso3: 'Paso 3 — Evaluación de subfactores',
  paso5: 'Paso 5 — FODA y soporte',
}

function HistorialModal({ evaluacionId, onClose }: { evaluacionId: number; onClose: () => void }) {
  const [expanded, setExpanded] = useState<string | null>(null)

  const { data: snaps = [], isLoading } = useQuery({
    queryKey: ['snapshots', evaluacionId],
    queryFn: () => evaluacionesApi.snapshots(evaluacionId),
  })

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(15,39,68,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{ background: 'var(--white)', borderRadius: 16, padding: '28px 32px', width: '100%', maxWidth: 520, boxShadow: 'var(--shadow-lg)', maxHeight: '80vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <h2 style={{ fontFamily: '"DM Sans", sans-serif', fontSize: 19, fontWeight: 600, color: 'var(--dark)', margin: 0 }}>Historial de guardados</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray2)', fontSize: 16, padding: 4 }}>✕</button>
        </div>
        <p style={{ fontSize: 13, color: 'var(--gray2)', marginBottom: 20 }}>
          Capturas automáticas guardadas en cada paso completado.
        </p>

        {isLoading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[1, 2, 3].map((i) => (
              <div key={i} style={{ height: 52, background: '#eaecee', borderRadius: 10, animation: 'pulse 1.5s ease-in-out infinite' }} />
            ))}
          </div>
        )}

        {!isLoading && snaps.length === 0 && (
          <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--gray2)', fontSize: 13 }}>
            No hay capturas guardadas aún. Las capturas se crean automáticamente al completar cada paso.
          </div>
        )}

        {!isLoading && snaps.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {snaps.map((snap) => {
              const label = PASO_LABELS[snap.paso] ?? snap.paso
              const isExp = expanded === snap.paso
              const d = new Date(snap.creado)
              const dateStr = d.toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' })
              const timeStr = d.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })
              return (
                <div key={snap.paso} style={{ border: '1.5px solid #eaecee', borderRadius: 10, overflow: 'hidden' }}>
                  <button
                    onClick={() => setExpanded(isExp ? null : snap.paso)}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: isExp ? '#fafbfc' : 'var(--white)', border: 'none', cursor: 'pointer', gap: 12 }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: '#ebf5fb', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <span style={{ fontSize: 15, color: 'var(--blue)' }}>⊙</span>
                      </div>
                      <div style={{ textAlign: 'left' }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--dark)' }}>{label}</div>
                        <div style={{ fontSize: 11.5, color: 'var(--gray2)' }}>{dateStr} · {timeStr}</div>
                      </div>
                    </div>
                    <span style={{ fontSize: 11, color: 'var(--gray2)', transform: isExp ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }}>▼</span>
                  </button>
                  {isExp && (
                    <div style={{ padding: '12px 16px', borderTop: '1px solid #eaecee', background: '#fafbfc' }}>
                      <pre style={{ fontSize: 11, color: 'var(--gray1)', background: '#f2f3f4', borderRadius: 6, padding: '10px 12px', overflow: 'auto', maxHeight: 200, margin: 0, fontFamily: '"DM Mono", monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                        {JSON.stringify(snap.datos, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

const btnGhostStyle: React.CSSProperties = {
  background: 'transparent', color: 'var(--gray1)', border: '1.5px solid #d5d8dc',
  borderRadius: 8, padding: '10px 20px', fontSize: 14, fontWeight: 500, cursor: 'pointer',
}

function ShareModal({ evaluacionId, evaluacionNombre, onClose }: {
  evaluacionId: number
  evaluacionNombre: string
  onClose: () => void
}) {
  const qc = useQueryClient()
  const [correo, setCorreo] = useState('')
  const [success, setSuccess] = useState('')

  const { data: shares = [], isLoading: sharesLoading } = useQuery({
    queryKey: ['compartir-list', evaluacionId],
    queryFn: () => evaluacionesApi.compartirList(evaluacionId),
  })

  const shareMutation = useMutation({
    mutationFn: () => evaluacionesApi.compartir(evaluacionId, correo),
    onSuccess: (data: { detail: string }) => {
      setSuccess(data.detail)
      setCorreo('')
      qc.invalidateQueries({ queryKey: ['compartir-list', evaluacionId] })
    },
  })

  const removeMutation = useMutation({
    mutationFn: (uid: number) => evaluacionesApi.compartirRemove(evaluacionId, uid),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['compartir-list', evaluacionId] }),
  })

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(15,39,68,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{ background: 'var(--white)', borderRadius: 16, padding: 32, width: '100%', maxWidth: 460, boxShadow: 'var(--shadow-lg)' }}>
        <h2 style={{ fontFamily: '"DM Sans", sans-serif', fontSize: 19, fontWeight: 600, color: 'var(--dark)', marginBottom: 6 }}>Compartir evaluación</h2>
        <p style={{ color: 'var(--gray2)', fontSize: 13, marginBottom: 14 }}>
          Permite a otro usuario ver esta evaluación en su panel de compartidas.
        </p>
        <div style={{ background: '#ebf5fb', border: '1px solid #aed6f1', borderRadius: 8, padding: '9px 14px', fontSize: 13, color: 'var(--blue)', marginBottom: 18 }}>
          <strong>{evaluacionNombre}</strong>
        </div>

        {/* Current shares */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--gray2)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 8 }}>
            Acceso compartido {shares.length > 0 && `(${shares.length})`}
          </div>
          {sharesLoading ? (
            <div style={{ height: 36, background: '#eaecee', borderRadius: 8, animation: 'pulse 1.5s ease-in-out infinite' }} />
          ) : shares.length === 0 ? (
            <p style={{ fontSize: 12.5, color: 'var(--gray2)', fontStyle: 'italic', margin: 0 }}>
              Aún no has compartido esta evaluación con nadie.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {shares.map((u) => (
                <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: '#fafbfc', border: '1px solid #eaecee', borderRadius: 8 }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--light)', color: 'var(--white)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                    {(u.nombre[0] ?? '').toUpperCase()}{(u.apellido[0] ?? '').toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--dark)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {u.nombre} {u.apellido}
                    </div>
                    <div style={{ fontSize: 11.5, color: 'var(--gray2)' }}>{u.correo}</div>
                  </div>
                  <button
                    onClick={() => removeMutation.mutate(u.id)}
                    disabled={removeMutation.isPending}
                    title="Revocar acceso"
                    style={{ width: 26, height: 26, borderRadius: 6, border: '1px solid #d5d8dc', background: 'transparent', cursor: 'pointer', color: 'var(--gray2)', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = '#f9ebea'; e.currentTarget.style.color = 'var(--red)'; e.currentTarget.style.borderColor = '#f0b0a8' }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--gray2)'; e.currentTarget.style.borderColor = '#d5d8dc' }}
                  >✕</button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add new share */}
        {success && (
          <div style={{ background: '#eafaf1', border: '1px solid #a9dfbf', borderRadius: 8, padding: '9px 14px', fontSize: 13, color: 'var(--green)', marginBottom: 12 }}>
            {success}
          </div>
        )}
        {shareMutation.isError && (
          <div style={{ background: '#f9ebea', border: '1px solid #e59866', borderRadius: 8, padding: '9px 14px', fontSize: 13, color: 'var(--red)', marginBottom: 12 }}>
            {(shareMutation.error as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? 'Error al compartir.'}
          </div>
        )}

        <form onSubmit={(e) => { e.preventDefault(); setSuccess(''); shareMutation.mutate() }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
            <input
              type="email" required value={correo} onChange={(e) => setCorreo(e.target.value)}
              placeholder="usuario@ejemplo.com"
              style={{ flex: 1, border: '1.5px solid #d5d8dc', borderRadius: 8, padding: '9px 13px', fontSize: 13.5, color: 'var(--gray1)', outline: 'none', boxSizing: 'border-box' }}
              onFocus={(e) => { e.target.style.borderColor = 'var(--light)' }}
              onBlur={(e) => { e.target.style.borderColor = '#d5d8dc' }}
            />
            <button
              type="submit" disabled={shareMutation.isPending}
              style={{ background: 'var(--dark)', color: 'var(--white)', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 13.5, fontWeight: 500, cursor: shareMutation.isPending ? 'not-allowed' : 'pointer', opacity: shareMutation.isPending ? 0.7 : 1, flexShrink: 0 }}
            >{shareMutation.isPending ? '...' : 'Invitar'}</button>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose} style={btnGhostStyle}>Cerrar</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function SoftwareInfoModal({ evaluacionId, software, onClose }: {
  evaluacionId: number
  software: string
  onClose: () => void
}) {
  const { data, isLoading, isError } = useQuery<SoftwareInfo>({
    queryKey: ['software-info', evaluacionId],
    queryFn: () => evaluacionesApi.softwareInfo(evaluacionId),
    staleTime: 30 * 60 * 1000,
    retry: 1,
  })

  const gh = data?.github
  const wp = data?.wikipedia

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(15,39,68,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{ background: 'var(--white)', borderRadius: 16, padding: '28px 32px', width: '100%', maxWidth: 560, boxShadow: 'var(--shadow-lg)', maxHeight: '85vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <h2 style={{ fontFamily: '"DM Sans", sans-serif', fontSize: 19, fontWeight: 600, color: 'var(--dark)', margin: 0 }}>{software}</h2>
            <p style={{ fontSize: 12.5, color: 'var(--gray2)', marginTop: 3 }}>Información técnica del software</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray2)', fontSize: 18, padding: 4 }}>✕</button>
        </div>

        {isLoading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '24px 0', color: 'var(--gray2)', fontSize: 13 }}>
            <div style={{ width: 18, height: 18, border: '2px solid #aed6f1', borderTopColor: 'var(--blue)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            Consultando GitHub y Wikipedia...
          </div>
        )}

        {isError && (
          <div style={{ background: '#f9ebea', border: '1px solid #e59866', borderRadius: 8, padding: '12px 14px', fontSize: 13, color: 'var(--gray1)' }}>
            No se pudo obtener la información del software.
          </div>
        )}

        {data && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {gh ? (
              <div style={{ background: '#f6f8fa', border: '1px solid #e1e4e8', borderRadius: 12, padding: '18px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <span style={{ fontSize: 16 }}>⎇</span>
                  <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--dark)' }}>GitHub</span>
                  {gh.licencia && (
                    <span style={{ fontSize: 10.5, fontWeight: 600, padding: '1px 8px', borderRadius: 99, background: '#e6f4ea', color: '#0e6655', marginLeft: 'auto' }}>{gh.licencia}</span>
                  )}
                </div>
                {gh.descripcion && <p style={{ fontSize: 13, color: 'var(--gray1)', lineHeight: 1.55, marginBottom: 12 }}>{gh.descripcion}</p>}
                <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                  {[
                    { icon: '★', value: gh.estrellas.toLocaleString(), label: 'Stars' },
                    { icon: '⑂', value: gh.forks.toLocaleString(), label: 'Forks' },
                    { icon: '●', value: gh.issues_abiertos.toLocaleString(), label: 'Issues' },
                  ].map((stat) => (
                    <div key={stat.label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: 'var(--gray1)' }}>
                      <span style={{ color: 'var(--gray2)', fontSize: 12 }}>{stat.icon}</span>
                      <span style={{ fontFamily: '"DM Mono", monospace', fontWeight: 600 }}>{stat.value}</span>
                      <span style={{ color: 'var(--gray3)' }}>{stat.label}</span>
                    </div>
                  ))}
                  {gh.ultimo_push && (
                    <div style={{ fontSize: 12, color: 'var(--gray2)' }}>
                      Último push: <strong style={{ color: 'var(--gray1)' }}>{new Date(gh.ultimo_push).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}</strong>
                    </div>
                  )}
                </div>
                {gh.lenguaje && (
                  <div style={{ marginTop: 8, fontSize: 12, color: 'var(--gray2)' }}>
                    Lenguaje principal: <span style={{ fontFamily: '"DM Mono", monospace', color: 'var(--gray1)', fontWeight: 600 }}>{gh.lenguaje}</span>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ padding: '12px 14px', background: '#f2f3f4', borderRadius: 10, fontSize: 13, color: 'var(--gray3)', fontStyle: 'italic' }}>
                No se encontró repositorio GitHub para este software.
              </div>
            )}

            {wp ? (
              <div style={{ border: '1px solid #eaecee', borderRadius: 12, padding: '18px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                  {wp.imagen && (
                    <img
                      src={wp.imagen}
                      alt={wp.titulo}
                      style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 8, flexShrink: 0, border: '1px solid #eaecee' }}
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                    />
                  )}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--dark)' }}>Wikipedia</span>
                      <span style={{ fontSize: 11, color: 'var(--gray3)', textTransform: 'uppercase', letterSpacing: '.04em' }}>{wp.idioma}</span>
                    </div>
                    <p style={{ fontSize: 13, color: 'var(--gray1)', lineHeight: 1.6, margin: 0 }}>{wp.resumen}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ padding: '12px 14px', background: '#f2f3f4', borderRadius: 10, fontSize: 13, color: 'var(--gray3)', fontStyle: 'italic' }}>
                No se encontró artículo de Wikipedia para este software.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
