import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { evaluacionesApi } from '@/api/evaluaciones'
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
        padding: '0 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
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
            <span style={{ fontFamily: '"DM Sans", sans-serif', fontSize: 16, fontWeight: 600, color: 'var(--dark)', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 400 }}>
              {evaluacion.nombre}
            </span>
            <span style={{ fontSize: 12, color: 'var(--gray2)' }}>{evaluacion.software}</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--green)' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)', display: 'inline-block' }} />
            Guardado automáticamente
          </div>
          <button
            onClick={() => setShowShare(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', border: '1.5px solid #d5d8dc', borderRadius: 8, padding: '6px 14px', fontSize: 13, color: 'var(--gray1)', cursor: 'pointer' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--gray4)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
          >⤴ Compartir</button>
        </div>
      </div>

      {showShare && evaluacion && (
        <ShareModal
          evaluacionId={Number(id)}
          evaluacionNombre={evaluacion.nombre}
          onClose={() => setShowShare(false)}
        />
      )}

      {/* ── Stepper ── */}
      <div style={{
        background: 'var(--white)', borderBottom: '1px solid rgba(0,0,0,0.06)',
        padding: '14px 32px 0', display: 'flex', alignItems: 'center', gap: 8, overflowX: 'auto',
      }}>
        {STEPS.map((step, i) => {
          const done = step.num < pasoActual
          const active = step.num === pasoActual
          return (
            <div key={step.num} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, minWidth: 68, paddingBottom: 14 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
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
                <div style={{ width: 40, height: 2, background: done ? 'var(--green)' : '#eaecee', borderRadius: 2, marginBottom: 18, flexShrink: 0 }} />
              )}
            </div>
          )
        })}
      </div>

      {/* ── Content ── */}
      <div style={{ flex: 1, padding: '24px 32px', maxWidth: 1100, width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>
        {pasoActual === 1 && <Paso1 evaluacionId={Number(id)} />}
        {pasoActual === 2 && <Paso2 evaluacionId={Number(id)} />}
        {pasoActual === 3 && <Paso3 evaluacionId={Number(id)} />}
        {pasoActual === 4 && <Paso4 evaluacionId={Number(id)} />}
        {pasoActual === 5 && <Paso5 evaluacionId={Number(id)} />}
        {pasoActual === 6 && <Paso6 evaluacionId={Number(id)} />}
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
  const [correo, setCorreo] = useState('')
  const [success, setSuccess] = useState('')

  const shareMutation = useMutation({
    mutationFn: () => evaluacionesApi.compartir(evaluacionId, correo),
    onSuccess: (data: { detail: string }) => {
      setSuccess(data.detail)
      setCorreo('')
    },
  })

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(15,39,68,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{ background: 'var(--white)', borderRadius: 16, padding: 32, width: '100%', maxWidth: 420, boxShadow: 'var(--shadow-lg)' }}>
        <h2 style={{ fontFamily: '"DM Sans", sans-serif', fontSize: 19, fontWeight: 600, color: 'var(--dark)', marginBottom: 6 }}>Compartir evaluación</h2>
        <p style={{ color: 'var(--gray2)', fontSize: 13, marginBottom: 20 }}>
          Permite a otro usuario con rol <strong>Consultor</strong> o <strong>Evaluador</strong> ver esta evaluación.
        </p>
        <div style={{ background: '#ebf5fb', border: '1px solid #aed6f1', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'var(--blue)', marginBottom: 20 }}>
          <strong>{evaluacionNombre}</strong>
        </div>

        {success && (
          <div style={{ background: '#eafaf1', border: '1px solid #a9dfbf', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'var(--green)', marginBottom: 16 }}>
            {success}
          </div>
        )}
        {shareMutation.isError && (
          <div style={{ background: '#f9ebea', border: '1px solid #e59866', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'var(--red)', marginBottom: 16 }}>
            {(shareMutation.error as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? 'Error al compartir la evaluación.'}
          </div>
        )}

        <form onSubmit={(e) => { e.preventDefault(); shareMutation.mutate() }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 22 }}>
            <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--gray1)' }}>Correo del destinatario</label>
            <input
              type="email" required value={correo} onChange={(e) => setCorreo(e.target.value)}
              placeholder="usuario@ejemplo.com"
              style={{ width: '100%', border: '1.5px solid #d5d8dc', borderRadius: 8, padding: '10px 14px', fontSize: 14, color: 'var(--gray1)', outline: 'none', boxSizing: 'border-box' }}
              onFocus={(e) => { e.target.style.borderColor = 'var(--light)' }}
              onBlur={(e) => { e.target.style.borderColor = '#d5d8dc' }}
            />
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose} style={btnGhostStyle}>Cerrar</button>
            <button
              type="submit" disabled={shareMutation.isPending}
              style={{ background: 'var(--dark)', color: 'var(--white)', border: 'none', borderRadius: 8, padding: '11px 22px', fontSize: 14, fontWeight: 500, cursor: shareMutation.isPending ? 'not-allowed' : 'pointer', opacity: shareMutation.isPending ? 0.7 : 1 }}
            >{shareMutation.isPending ? 'Compartiendo...' : 'Compartir'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
