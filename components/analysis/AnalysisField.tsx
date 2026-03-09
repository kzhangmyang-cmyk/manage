import type { CSSProperties } from 'react'

type Tone = 'default' | 'accent' | 'alert'

type AnalysisFieldProps = {
  label: string
  value: string
  tone?: Tone
}

const toneMap: Record<Tone, CSSProperties> = {
  default: {
    color: 'var(--color-text)',
    background: 'rgba(255, 255, 255, 0.74)',
    border: '1px solid var(--color-border-soft)',
  },
  accent: {
    color: 'var(--color-accent-strong)',
    background: 'rgba(229, 241, 238, 0.82)',
    border: '1px solid rgba(32, 106, 94, 0.22)',
  },
  alert: {
    color: '#8b4632',
    background: 'rgba(235, 214, 207, 0.82)',
    border: '1px solid rgba(178, 95, 69, 0.2)',
  },
}

export function AnalysisField({ label, value, tone = 'default' }: AnalysisFieldProps) {
  return (
    <div
      style={{
        padding: '16px',
        borderRadius: '18px',
        display: 'grid',
        gap: '10px',
        ...toneMap[tone],
      }}
    >
      <div
        style={{
          fontSize: '0.78rem',
          fontWeight: 700,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: 'var(--color-text-muted)',
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: '1rem', fontWeight: 600, lineHeight: 1.55 }}>{value}</div>
    </div>
  )
}
