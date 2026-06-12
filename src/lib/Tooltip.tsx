import { useState } from 'react'

export const GUIOS_GLOSSARY: Record<string, { full: string; desc: string }> = {
  IE: {
    full: 'Importancia Estratégica',
    desc: 'Valor que tú asignas (1–4) según cuánto importa este factor para la estrategia de tu organización.',
  },
  IL: {
    full: 'Importancia de la Literatura',
    desc: 'Valor fijo derivado de 57 artículos científicos y encuesta a 57 expertos de la metodología GUIOS. No editable.',
  },
  IS: {
    full: 'Importancia Sugerida',
    desc: 'Calculada automáticamente por GUIOS a partir de IE e IL. Es fija e inmutable — representa la recomendación del sistema.',
  },
  ID: {
    full: 'Importancia del Decisor',
    desc: 'El valor IE que tú asignas al factor. Se combina con el IS del sistema para calcular la Importancia Relativa (IR).',
  },
  IR: {
    full: 'Importancia Relativa',
    desc: 'Resultado de combinar ID e IS. Si IR = 1, el factor queda excluido automáticamente por ser de baja prioridad para tu contexto.',
  },
  PM: {
    full: 'Puntuación Media',
    desc: 'Promedio de los subfactores evaluados. Escala 1–4. PM ≥ 3.0 clasifica el factor como positivo (Fortaleza u Oportunidad); PM < 3.0 como negativo.',
  },
  PS: {
    full: 'Puntuación de Subfactor',
    desc: 'Valor asignado a cada subfactor: 1 = No cumple, 2 = No sé / Sin información, 3 = Cumple parcialmente, 4 = Cumple totalmente.',
  },
  FODA: {
    full: 'Fortalezas · Oportunidades · Debilidades · Amenazas',
    desc: 'Clasificación estratégica de cada factor según PM y tipo de impacto. PM ≥ 3 + interno = Fortaleza · PM ≥ 3 + externo = Oportunidad · PM < 3 + interno = Debilidad · PM < 3 + externo = Amenaza.',
  },
  GUIOS: {
    full: 'Guía de Evaluación para la Implantación de Open Source',
    desc: 'Metodología científica basada en la tesis doctoral de Víctor Hugo Rea Sánchez (Universidad de Sevilla, 2022). Formaliza la decisión de adoptar software libre con 57 factores validados.',
  },
}

export function GlossaryTerm({ term, children }: { term: string; children?: React.ReactNode }) {
  const [visible, setVisible] = useState(false)
  const def = GUIOS_GLOSSARY[term]
  if (!def) return <>{children ?? term}</>

  return (
    <span
      style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', cursor: 'help', verticalAlign: 'baseline' }}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      <span style={{ borderBottom: '1.5px dotted currentColor', lineHeight: 'inherit' }}>
        {children ?? term}
      </span>
      {visible && (
        <span
          role="tooltip"
          style={{
            position: 'absolute',
            bottom: 'calc(100% + 7px)',
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#1c2333',
            color: '#dde3ea',
            fontSize: 11.5,
            lineHeight: 1.55,
            padding: '8px 12px',
            borderRadius: 7,
            zIndex: 9999,
            pointerEvents: 'none',
            width: 230,
            boxShadow: '0 4px 18px rgba(0,0,0,0.32)',
            textAlign: 'left',
            fontWeight: 400,
          }}
        >
          <span style={{ display: 'block', fontWeight: 700, color: '#7ec8e3', marginBottom: 4, fontSize: 11.5, fontFamily: '"DM Mono", monospace' }}>
            {term} — {def.full}
          </span>
          {def.desc}
          <span style={{
            position: 'absolute',
            top: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: 0,
            height: 0,
            borderLeft: '5px solid transparent',
            borderRight: '5px solid transparent',
            borderTop: '5px solid #1c2333',
          }} />
        </span>
      )}
    </span>
  )
}
