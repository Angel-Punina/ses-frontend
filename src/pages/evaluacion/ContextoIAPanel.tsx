import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { evaluacionesApi, type IaFuente } from '@/api/evaluaciones'

interface Props {
  evaluacionId: number
  factorCatalogId: number
  factorNombre: string
}

// ── Inline markdown: **bold**, *italic*, [n] citation badges ──────────────────
function renderInline(text: string): React.ReactNode[] {
  const segments = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|\[\d+\])/g)
  return segments.map((seg, i) => {
    if (/^\*\*[^*]+\*\*$/.test(seg)) {
      return <strong key={i} style={{ fontWeight: 600, color: '#1a5276' }}>{seg.slice(2, -2)}</strong>
    }
    if (/^\*[^*]+\*$/.test(seg)) {
      return <em key={i} style={{ fontStyle: 'italic' }}>{seg.slice(1, -1)}</em>
    }
    if (/^\[\d+\]$/.test(seg)) {
      return (
        <sup key={i}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 9, fontWeight: 700, color: '#2980b9', background: '#d6eaf8',
            borderRadius: 4, padding: '1px 4px', marginInline: 1, lineHeight: 1.4, cursor: 'default',
          }}>{seg}</span>
        </sup>
      )
    }
    return seg
  })
}

// ── Block markdown renderer ───────────────────────────────────────────────────
function MarkdownBlock({ text }: { text: string }) {
  const lines = text.split('\n')
  const elements: React.ReactNode[] = []
  let buf: string[] = []
  let i = 0

  const flushParagraph = () => {
    const joined = buf.join(' ').trim()
    if (joined) {
      elements.push(
        <p key={`p${elements.length}`} style={{ fontSize: 13, color: '#1a5276', lineHeight: 1.75, margin: '0 0 10px' }}>
          {renderInline(joined)}
        </p>
      )
    }
    buf = []
  }

  while (i < lines.length) {
    const line = lines[i]

    // ## / ### Heading
    const hm = line.match(/^(#{1,3})\s+(.+)$/)
    if (hm) {
      flushParagraph()
      const level = hm[1].length
      elements.push(
        <div key={`h${i}`} style={{
          fontSize: level === 1 ? 13.5 : 12.5,
          fontWeight: 700, color: '#154360',
          marginTop: elements.length > 0 ? 16 : 0, marginBottom: 6,
          paddingBottom: level <= 2 ? 5 : 0,
          borderBottom: level <= 2 ? '1px solid #aed6f1' : 'none',
          letterSpacing: '0.01em',
        }}>
          {renderInline(hm[2])}
        </div>
      )
      i++; continue
    }

    // > Blockquote
    if (line.startsWith('> ')) {
      flushParagraph()
      elements.push(
        <div key={`bq${i}`} style={{
          borderLeft: '3px solid #85c1e9', paddingLeft: 12, marginBottom: 10,
          color: '#2471a3', fontSize: 12.5, fontStyle: 'italic', lineHeight: 1.65,
        }}>
          {renderInline(line.slice(2))}
        </div>
      )
      i++; continue
    }

    // - List items (collect consecutive)
    if (/^[-*•]\s/.test(line)) {
      flushParagraph()
      const items: string[] = []
      while (i < lines.length && /^[-*•]\s/.test(lines[i])) {
        items.push(lines[i].replace(/^[-*•]\s+/, ''))
        i++
      }
      elements.push(
        <ul key={`ul${i}`} style={{ margin: '0 0 10px', paddingLeft: 0, listStyle: 'none' }}>
          {items.map((item, idx) => (
            <li key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13, color: '#1a5276', lineHeight: 1.65, marginBottom: 5 }}>
              <span style={{ marginTop: 7, width: 5, height: 5, borderRadius: '50%', background: '#2980b9', flexShrink: 0 }} />
              <span>{renderInline(item)}</span>
            </li>
          ))}
        </ul>
      )
      continue
    }

    // Empty line → flush
    if (line.trim() === '') { flushParagraph(); i++; continue }

    buf.push(line)
    i++
  }
  flushParagraph()
  return <>{elements}</>
}

// ── Component ─────────────────────────────────────────────────────────────────
export function ContextoIAPanel({ evaluacionId, factorCatalogId, factorNombre }: Props) {
  const [expanded, setExpanded] = useState(false)
  const [showPapers, setShowPapers] = useState(false)

  const { data, isLoading, error } = useQuery({
    queryKey: ['ia-contexto', evaluacionId, factorCatalogId],
    queryFn: () => evaluacionesApi.iaContexto(evaluacionId, factorCatalogId),
    enabled: expanded,
    staleTime: Infinity,
    retry: false,
  })

  return (
    <div style={{
      borderTop: '1px solid #e8f4fd',
      background: expanded ? '#f4faff' : 'transparent',
      transition: 'background 0.2s',
    }}>
      {/* ── Trigger ── */}
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 8,
          padding: '9px 20px', background: 'transparent', border: 'none',
          cursor: 'pointer', textAlign: 'left',
        }}
      >
        {/* Research icon */}
        <span style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: 22, height: 22, borderRadius: 6, fontSize: 12,
          background: expanded ? '#2980b9' : '#d6eaf8',
          color: expanded ? '#fff' : '#2980b9',
          flexShrink: 0, transition: 'all 0.2s',
        }}>
          {expanded ? '▾' : '⚗'}
        </span>
        <span style={{ fontSize: 12.5, fontWeight: 500, color: expanded ? '#1a5276' : '#5d8ba3' }}>
          {expanded ? 'Ocultar investigación científica' : 'Ver investigación reciente (2020-2026)'}
        </span>
        {data?.cache_hit && (
          <span style={{ fontSize: 10, color: '#1e8449', background: '#eafaf1', padding: '1px 7px', borderRadius: 10, border: '1px solid #a9dfbf' }}>
            caché
          </span>
        )}
        {data?.fuentes && data.fuentes.length > 0 && !data.cache_hit && (
          <span style={{ fontSize: 10, color: '#2980b9', background: '#d6eaf8', padding: '1px 7px', borderRadius: 10, border: '1px solid #aed6f1' }}>
            {data.fuentes.length} papers
          </span>
        )}
        <span style={{ marginLeft: 'auto', color: '#85929e', fontSize: 11, transition: 'transform 0.25s', transform: expanded ? 'rotate(180deg)' : 'none' }}>▾</span>
      </button>

      {/* ── Panel body ── */}
      {expanded && (
        <div style={{ padding: '0 20px 18px' }}>

          {/* Loading */}
          {isLoading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 0', color: '#5d8ba3' }}>
              <span style={{
                display: 'inline-block', width: 14, height: 14,
                border: '2px solid #aed6f1', borderTopColor: '#2980b9',
                borderRadius: '50%', animation: 'spin 0.8s linear infinite',
              }} />
              <span style={{ fontSize: 13 }}>
                Consultando literatura científica sobre <em>{factorNombre}</em>…
              </span>
            </div>
          )}

          {/* Error */}
          {error && !data && (
            <div style={{ background: '#f9ebea', borderRadius: 8, padding: '10px 14px', fontSize: 12.5, color: '#c0392b', border: '1px solid #f5b7b1' }}>
              No se pudo obtener contexto científico. Verifica la conexión o la clave de API.
            </div>
          )}

          {/* Content */}
          {data && (
            <div>
              {/* Header bar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#1a5276', background: '#d6eaf8', padding: '3px 10px', borderRadius: 12 }}>
                  Evidencia científica · {factorNombre}
                </span>
                {data.cache_hit && (
                  <span style={{ fontSize: 10.5, color: '#1e8449' }}>· desde caché</span>
                )}
              </div>

              {/* Rendered markdown */}
              <div style={{
                background: 'var(--white)', border: '1px solid #aed6f1', borderRadius: 10,
                padding: '14px 18px', marginBottom: 12,
              }}>
                <MarkdownBlock text={data.resumen} />
              </div>

              {/* Papers */}
              {data.fuentes && data.fuentes.length > 0 && (
                <div>
                  <button
                    onClick={() => setShowPapers(!showPapers)}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      fontSize: 11.5, color: '#2980b9', fontWeight: 600,
                      padding: '0 0 8px', display: 'flex', alignItems: 'center', gap: 6,
                    }}
                  >
                    <span style={{ fontSize: 10, transform: showPapers ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s', display: 'inline-block' }}>▶</span>
                    {data.fuentes.length} artículo{data.fuentes.length !== 1 ? 's' : ''} analizados
                  </button>
                  {showPapers && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {[...data.fuentes].sort((a, b) => (b.citas || 0) - (a.citas || 0)).map((f: IaFuente, idx: number) => (
                        <PaperCard key={f.titulo || idx} fuente={f} num={idx + 1} />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Disclaimer */}
              <p style={{ fontSize: 11, color: '#aab7b8', marginTop: 10, marginBottom: 0, fontStyle: 'italic' }}>
                La IA informa con base en literatura científica. No toma decisiones por el evaluador.
              </p>
            </div>
          )}
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

function PaperCard({ fuente, num }: { fuente: IaFuente; num: number }) {
  return (
    <div style={{
      background: '#f4faff', border: '1px solid #d6eaf8', borderRadius: 8,
      padding: '8px 12px', display: 'flex', gap: 10, alignItems: 'flex-start',
    }}>
      <span style={{
        fontSize: 10, fontWeight: 700, color: '#2980b9', background: '#d6eaf8',
        padding: '2px 6px', borderRadius: 5, flexShrink: 0, marginTop: 1, fontFamily: '"DM Mono", monospace',
      }}>[{num}]</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 12.5, fontWeight: 500, color: '#1a5276', margin: '0 0 3px', lineHeight: 1.4 }}>
          {fuente.titulo || 'Sin título'}
        </p>
        <div style={{ display: 'flex', gap: 8, fontSize: 11, color: '#85929e', flexWrap: 'wrap' }}>
          {fuente.anio && <span>{fuente.anio}</span>}
          {fuente.citas > 0 && <span>· {fuente.citas} citas</span>}
          {fuente.autores && fuente.autores.length > 0 && (
            <span>· {fuente.autores.slice(0, 2).join(', ')}{fuente.autores.length > 2 ? ' et al.' : ''}</span>
          )}
        </div>
      </div>
    </div>
  )
}
