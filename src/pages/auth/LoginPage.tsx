import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { authApi } from '@/api/auth'
import { useAuthStore } from '@/store/authStore'
import { useIsMobile } from '@/lib/useMediaQuery'

const inputStyle: React.CSSProperties = {
  width: '100%',
  border: '1.5px solid #d5d8dc',
  borderRadius: 8,
  padding: '10px 14px',
  fontSize: 14,
  color: 'var(--gray1)',
  background: 'var(--white)',
  outline: 'none',
  transition: 'border-color 0.2s, box-shadow 0.2s',
}

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const setUser = useAuthStore((s) => s.setUser)
  const isMobile = useIsMobile()

  const registered = (location.state as { registered?: boolean } | null)?.registered ?? false

  const [form, setForm] = useState({ correo: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await authApi.login(form)
      const user = await authApi.me()
      setUser(user)
      navigate('/dashboard')
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { detail?: string } } }
      setError(axiosError.response?.data?.detail ?? 'Credenciales incorrectas.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', minHeight: '100vh' }}>
      {/* ── Brand panel — hidden on mobile ── */}
      {!isMobile && <div style={{
        background: 'var(--dark)',
        padding: '60px 52px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', width: 400, height: 400, borderRadius: '50%', pointerEvents: 'none',
          background: 'radial-gradient(circle, rgba(46,134,193,0.18) 0%, transparent 70%)',
          top: -100, right: -100,
        }} />
        <div style={{
          position: 'absolute', width: 300, height: 300, borderRadius: '50%', pointerEvents: 'none',
          background: 'radial-gradient(circle, rgba(230,126,34,0.1) 0%, transparent 70%)',
          bottom: 40, left: -60,
        }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{
            display: 'inline-block', background: 'rgba(230,126,34,0.2)', color: 'var(--accent)',
            fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', padding: '4px 10px',
            borderRadius: 20, marginBottom: 28, border: '1px solid rgba(230,126,34,0.3)',
          }}>
            METODOLOGÍA GUIOS
          </div>

          <div style={{ marginBottom: 20 }}>
            <img
              src="/seslogo.png"
              alt="SES"
              style={{ width: 220, height: 'auto', display: 'block', borderRadius: 12 }}
            />
          </div>

          <h1 style={{
            fontFamily: '"Fraunces", serif', fontSize: 40, fontWeight: 300,
            color: 'var(--white)', lineHeight: 1.18, letterSpacing: '-0.02em', marginBottom: 16,
          }}>
            Evaluación de<br />
            <em style={{ fontStyle: 'italic', fontWeight: 600, color: '#aed6f1' }}>Software Libre</em>
          </h1>

          <p style={{ color: '#7fb3d3', fontSize: 14, marginBottom: 28, lineHeight: 1.5 }}>
            Sistema de apoyo a la toma de decisiones<br />
            para la adopción de FLOSS en organizaciones.
          </p>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {['18 Factores', '61 Subfactores', 'Análisis FODA', 'IA Integrada'].map((chip) => (
              <span key={chip} style={{
                background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
                color: '#aed6f1', fontSize: 12, padding: '4px 12px', borderRadius: 20,
              }}>{chip}</span>
            ))}
          </div>
        </div>
      </div>}

      {/* ── Form panel ── */}
      <div style={{
        background: 'var(--bg)', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        padding: isMobile ? '32px 20px' : 40,
        minHeight: isMobile ? '100vh' : undefined,
      }}>
        <div style={{
          background: 'var(--white)', borderRadius: 16, padding: 40,
          width: '100%', maxWidth: 420,
          boxShadow: 'var(--shadow-lg)', border: '1px solid rgba(0,0,0,0.06)',
        }}>
          <h2 style={{
            fontFamily: '"Fraunces", serif', fontSize: 24, fontWeight: 600,
            color: 'var(--dark)', marginBottom: 6,
          }}>Iniciar sesión</h2>
          <p style={{ color: 'var(--gray2)', fontSize: 13.5, marginBottom: 28 }}>
            Ingresa tus credenciales para continuar
          </p>

          {registered && (
            <div style={{
              background: '#eafaf1', border: '1px solid #a9dfbf', borderRadius: 8,
              padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#1a5e31',
            }}>
              Cuenta creada exitosamente. Inicia sesión para continuar.
            </div>
          )}

          {error && (
            <div style={{
              background: '#f9ebea', border: '1px solid #e59866', borderRadius: 8,
              padding: '10px 14px', marginBottom: 16, fontSize: 13, color: 'var(--red)',
            }}>{error}</div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
              <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--gray1)' }}>
                Correo electrónico
              </label>
              <input
                type="email"
                required
                placeholder="correo@organización.com"
                value={form.correo}
                onChange={(e) => setForm({ ...form, correo: e.target.value })}
                style={inputStyle}
                onFocus={(e) => {
                  e.target.style.borderColor = 'var(--light)'
                  e.target.style.boxShadow = '0 0 0 3px rgba(46,134,193,0.12)'
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#d5d8dc'
                  e.target.style.boxShadow = 'none'
                }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 24 }}>
              <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--gray1)' }}>
                Contraseña
              </label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                style={inputStyle}
                onFocus={(e) => {
                  e.target.style.borderColor = 'var(--light)'
                  e.target.style.boxShadow = '0 0 0 3px rgba(46,134,193,0.12)'
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#d5d8dc'
                  e.target.style.boxShadow = 'none'
                }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', background: 'var(--dark)', color: 'var(--white)',
                border: 'none', borderRadius: 8, padding: '11px 22px',
                fontSize: 14, fontWeight: 500, cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: 8, opacity: loading ? 0.7 : 1, transition: 'background 0.2s',
              }}
              onMouseEnter={(e) => { if (!loading) e.currentTarget.style.background = 'var(--mid)' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--dark)' }}
            >
              {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
            </button>
          </form>

          <div style={{
            textAlign: 'center', marginTop: 20, fontSize: 13.5, color: 'var(--gray2)',
            display: 'flex', gap: 6, justifyContent: 'center', alignItems: 'center',
          }}>
            ¿No tienes cuenta?
            <Link to="/register" style={{ color: 'var(--light)', fontWeight: 500 }}>
              Regístrate
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
