import { createContext, useCallback, useContext, useReducer, useRef } from 'react'

// ── Types ─────────────────────────────────────────────────────────────────────

export type ToastType = 'success' | 'error' | 'warning' | 'info'

interface Toast {
  id: number
  type: ToastType
  title: string
  message?: string
}

interface ToastState {
  toasts: Toast[]
}

type Action =
  | { type: 'ADD'; toast: Toast }
  | { type: 'REMOVE'; id: number }

// ── Context ───────────────────────────────────────────────────────────────────

interface ToastContextValue {
  show: (type: ToastType, title: string, message?: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

// ── Reducer ───────────────────────────────────────────────────────────────────

function reducer(state: ToastState, action: Action): ToastState {
  switch (action.type) {
    case 'ADD':
      return { toasts: [...state.toasts, action.toast] }
    case 'REMOVE':
      return { toasts: state.toasts.filter((t) => t.id !== action.id) }
    default:
      return state
  }
}

// ── Styles ────────────────────────────────────────────────────────────────────

const TYPE_STYLE: Record<ToastType, { border: string; bg: string; icon: string; titleColor: string; msgColor: string }> = {
  success: { border: '#a9dfbf', bg: '#eafaf1', icon: '✓', titleColor: '#1a5e31', msgColor: '#27ae60' },
  error:   { border: '#e6beba', bg: '#f9ebea', icon: '✕', titleColor: '#7b241c', msgColor: '#922b21' },
  warning: { border: '#f0c96a', bg: '#fef9e7', icon: '⚠', titleColor: '#7d5a00', msgColor: '#b7770d' },
  info:    { border: '#aed6f1', bg: '#ebf5fb', icon: 'ℹ', titleColor: '#1a5276', msgColor: '#2e86c1' },
}

// ── Toast item ────────────────────────────────────────────────────────────────

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: number) => void }) {
  const s = TYPE_STYLE[toast.type]
  return (
    <div
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 12,
        background: s.bg,
        border: `1.5px solid ${s.border}`,
        borderRadius: 10,
        padding: '14px 16px',
        boxShadow: '0 4px 20px rgba(15,39,68,0.12)',
        minWidth: 300, maxWidth: 420,
        animation: 'ses-toast-in 0.22s ease',
        position: 'relative',
      }}
    >
      {/* Icon */}
      <div style={{
        width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
        background: s.border, color: s.titleColor,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 13, fontWeight: 700,
      }}>
        {s.icon}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: s.titleColor, lineHeight: 1.3 }}>
          {toast.title}
        </div>
        {toast.message && (
          <div style={{ fontSize: 12.5, color: s.msgColor, marginTop: 4, lineHeight: 1.5 }}>
            {toast.message}
          </div>
        )}
      </div>

      {/* Close */}
      <button
        onClick={() => onRemove(toast.id)}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: s.msgColor, fontSize: 15, lineHeight: 1,
          padding: '0 2px', flexShrink: 0, opacity: 0.7,
        }}
        onMouseEnter={(e) => { e.currentTarget.style.opacity = '1' }}
        onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.7' }}
      >
        ×
      </button>
    </div>
  )
}

// ── Provider ──────────────────────────────────────────────────────────────────

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, { toasts: [] })
  const nextId = useRef(0)

  const show = useCallback((type: ToastType, title: string, message?: string) => {
    const id = ++nextId.current
    dispatch({ type: 'ADD', toast: { id, type, title, message } })
    setTimeout(() => dispatch({ type: 'REMOVE', id }), type === 'error' ? 8000 : 5000)
  }, [])

  const remove = useCallback((id: number) => {
    dispatch({ type: 'REMOVE', id })
  }, [])

  return (
    <ToastContext.Provider value={{ show }}>
      {children}

      {/* Portal-like fixed container */}
      <div
        style={{
          position: 'fixed', bottom: 24, right: 24,
          display: 'flex', flexDirection: 'column-reverse', gap: 10,
          zIndex: 9999, pointerEvents: 'none',
        }}
      >
        {state.toasts.map((t) => (
          <div key={t.id} style={{ pointerEvents: 'auto' }}>
            <ToastItem toast={t} onRemove={remove} />
          </div>
        ))}
      </div>

      <style>{`
        @keyframes ses-toast-in {
          from { opacity: 0; transform: translateY(12px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)    scale(1);    }
        }
      `}</style>
    </ToastContext.Provider>
  )
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside ToastProvider')
  return ctx
}
