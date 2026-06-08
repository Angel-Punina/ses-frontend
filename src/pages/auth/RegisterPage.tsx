import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authApi } from '@/api/auth'

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

const focusHandlers = {
  onFocus: (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.borderColor = 'var(--light)'
    e.target.style.boxShadow = '0 0 0 3px rgba(46,134,193,0.12)'
  },
  onBlur: (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.borderColor = '#d5d8dc'
    e.target.style.boxShadow = 'none'
  },
}

const errorInputStyle: React.CSSProperties = {
  ...inputStyle,
  borderColor: '#e74c3c',
}

export function RegisterPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    correo: '',
    nombre: '',
    apellido: '',
    password: '',
    password_confirm: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})

    // Client-side password match check before sending to server
    if (form.password !== form.password_confirm) {
      setErrors({ password_confirm: 'Las contraseñas no coinciden.' })
      return
    }

    setLoading(true)
    try {
      await authApi.register(form)
      navigate('/login', { state: { registered: true } })
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: unknown } }
      const responseData = axiosError.response?.data

      if (!responseData || typeof responseData !== 'object' || Array.isArray(responseData)) {
        setErrors({ non_field_errors: 'Error de conexión. Verifica que el servidor esté activo.' })
        setLoading(false)
        return
      }

      const data = responseData as Record<string, unknown>
      const mapped: Record<string, string> = {}
      for (const [key, val] of Object.entries(data)) {
        if (key === 'detail') {
          mapped['non_field_errors'] = String(val)
        } else {
          mapped[key] = Array.isArray(val) ? String(val[0]) : String(val)
        }
      }
      if (Object.keys(mapped).length === 0) {
        mapped['non_field_errors'] = 'Error inesperado al crear la cuenta. Intenta de nuevo.'
      }
      setErrors(mapped)
    } finally {
      setLoading(false)
    }
  }

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [k]: e.target.value })

  const passwordsMatch =
    form.password_confirm.length === 0 || form.password === form.password_confirm

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', minHeight: '100vh' }}>
      {/* ── Brand panel ── */}
      <div style={{
        background: 'var(--dark)', padding: '60px 52px',
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
        position: 'relative', overflow: 'hidden',
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

          <div style={{ marginBottom: 16 }}>
            <span style={{
              fontFamily: '"Fraunces", serif', fontSize: 42, fontWeight: 800,
              color: 'var(--white)', letterSpacing: '-0.02em', lineHeight: 1,
            }}>SES</span>
          </div>

          <h1 style={{
            fontFamily: '"Fraunces", serif', fontSize: 40, fontWeight: 300,
            color: 'var(--white)', lineHeight: 1.18, letterSpacing: '-0.02em', marginBottom: 16,
          }}>
            Únete al<br />
            <em style={{ fontStyle: 'italic', fontWeight: 600, color: '#aed6f1' }}>equipo evaluador</em>
          </h1>

          <p style={{ color: '#7fb3d3', fontSize: 14, marginBottom: 28, lineHeight: 1.5 }}>
            Crea tu cuenta para comenzar a evaluar<br />
            proyectos de software libre con GUIOS.
          </p>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {['18 Factores', '61 Subfactores', 'Análisis FODA', 'IA Integrada'].map((chip) => (
              <span key={chip} style={{
                background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
                color: '#aed6f1', fontSize: 12, padding: '4px 12px', borderRadius: 20,
              }}>{chip}</span>
            ))}
          </div>

          {/* Domain hint */}
          <div style={{
            marginTop: 32, background: 'rgba(46,134,193,0.12)', borderRadius: 10,
            padding: '12px 16px', border: '1px solid rgba(46,134,193,0.25)',
          }}>
            <p style={{ color: '#aed6f1', fontSize: 12, margin: 0, lineHeight: 1.6 }}>
              <strong style={{ color: '#85c1e9' }}>Acceso institucional:</strong><br />
              Los correos <strong>@unemi.edu.ec</strong> reciben rol de Administrador automáticamente.
              Otros correos reciben acceso de Consultor.
            </p>
          </div>
        </div>
      </div>

      {/* ── Form panel ── */}
      <div style={{
        background: 'var(--bg)', display: 'flex',
        alignItems: 'center', justifyContent: 'center', padding: 40,
        overflowY: 'auto',
      }}>
        <div style={{
          background: 'var(--white)', borderRadius: 16, padding: 40,
          width: '100%', maxWidth: 420,
          boxShadow: 'var(--shadow-lg)', border: '1px solid rgba(0,0,0,0.06)',
        }}>
          <h2 style={{
            fontFamily: '"Fraunces", serif', fontSize: 24, fontWeight: 600,
            color: 'var(--dark)', marginBottom: 6,
          }}>Crear cuenta</h2>
          <p style={{ color: 'var(--gray2)', fontSize: 13.5, marginBottom: 28 }}>
            Completa el formulario para registrarte
          </p>

          {errors.non_field_errors && (
            <div style={{
              background: '#f9ebea', border: '1px solid #e59866', borderRadius: 8,
              padding: '10px 14px', marginBottom: 16, fontSize: 13, color: 'var(--red)',
            }}>{errors.non_field_errors}</div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Nombre / Apellido row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--gray1)' }}>
                  Nombre <span style={{ color: 'var(--accent)' }}>*</span>
                </label>
                <input
                  type="text" required value={form.nombre} onChange={set('nombre')}
                  style={errors.nombre ? errorInputStyle : inputStyle}
                  {...focusHandlers}
                />
                {errors.nombre && (
                  <span style={{ fontSize: 12, color: 'var(--red)' }}>{errors.nombre}</span>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--gray1)' }}>
                  Apellido <span style={{ color: 'var(--accent)' }}>*</span>
                </label>
                <input
                  type="text" required value={form.apellido} onChange={set('apellido')}
                  style={errors.apellido ? errorInputStyle : inputStyle}
                  {...focusHandlers}
                />
                {errors.apellido && (
                  <span style={{ fontSize: 12, color: 'var(--red)' }}>{errors.apellido}</span>
                )}
              </div>
            </div>

            {/* Correo */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
              <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--gray1)' }}>
                Correo electrónico <span style={{ color: 'var(--accent)' }}>*</span>
              </label>
              <input
                type="email" required placeholder="correo@organización.com"
                value={form.correo} onChange={set('correo')}
                style={errors.correo ? errorInputStyle : inputStyle}
                {...focusHandlers}
              />
              {errors.correo && (
                <span style={{ fontSize: 12, color: 'var(--red)' }}>{errors.correo}</span>
              )}
            </div>

            {/* Contraseña */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
              <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--gray1)' }}>
                Contraseña <span style={{ color: 'var(--accent)' }}>*</span>
              </label>
              <input
                type="password" required placeholder="Mínimo 8 caracteres"
                value={form.password} onChange={set('password')}
                style={errors.password ? errorInputStyle : inputStyle}
                {...focusHandlers}
              />
              {errors.password && (
                <span style={{ fontSize: 12, color: 'var(--red)' }}>{errors.password}</span>
              )}
            </div>

            {/* Confirmar contraseña */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 24 }}>
              <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--gray1)' }}>
                Confirmar contraseña <span style={{ color: 'var(--accent)' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="password" required placeholder="Repite tu contraseña"
                  value={form.password_confirm} onChange={set('password_confirm')}
                  style={
                    errors.password_confirm
                      ? errorInputStyle
                      : (!passwordsMatch ? { ...inputStyle, borderColor: '#e74c3c' } : inputStyle)
                  }
                  {...focusHandlers}
                />
                {/* Live match indicator */}
                {form.password_confirm.length > 0 && (
                  <span style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    fontSize: 16,
                  }}>
                    {passwordsMatch ? '✓' : '✗'}
                  </span>
                )}
              </div>
              {errors.password_confirm && (
                <span style={{ fontSize: 12, color: 'var(--red)' }}>{errors.password_confirm}</span>
              )}
              {!passwordsMatch && !errors.password_confirm && form.password_confirm.length > 0 && (
                <span style={{ fontSize: 12, color: '#e74c3c' }}>Las contraseñas no coinciden.</span>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || !passwordsMatch}
              style={{
                width: '100%', background: 'var(--dark)', color: 'var(--white)',
                border: 'none', borderRadius: 8, padding: '11px 22px',
                fontSize: 14, fontWeight: 500,
                cursor: (loading || !passwordsMatch) ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: 8,
                opacity: (loading || !passwordsMatch) ? 0.6 : 1,
                transition: 'background 0.2s, opacity 0.2s',
              }}
              onMouseEnter={(e) => {
                if (!loading && passwordsMatch) e.currentTarget.style.background = 'var(--mid)'
              }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--dark)' }}
            >
              {loading ? 'Creando cuenta...' : 'Crear cuenta'}
            </button>
          </form>

          <div style={{
            textAlign: 'center', marginTop: 20, fontSize: 13.5, color: 'var(--gray2)',
            display: 'flex', gap: 6, justifyContent: 'center', alignItems: 'center',
          }}>
            ¿Ya tienes cuenta?
            <Link to="/login" style={{ color: 'var(--light)', fontWeight: 500 }}>
              Inicia sesión
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
