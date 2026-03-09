import type { CSSProperties } from 'react'
import type { TimelineItem as TimelineItemData } from '../../lib/types'

type TimelineVisualState = 'done' | 'current' | 'upcoming'

type TimelineItemProps = {
  item: TimelineItemData
  state: TimelineVisualState
  isLast: boolean
}

function getDotStyle(state: TimelineVisualState, highlight?: boolean): CSSProperties {
  if (state === 'current') {
    return {
      background: 'var(--color-alert)',
      boxShadow: '0 0 0 6px rgba(178, 95, 69, 0.12)',
      border: '2px solid rgba(255, 255, 255, 0.95)',
    }
  }

  if (state === 'done') {
    return {
      background: highlight ? 'var(--color-accent)' : 'var(--color-accent-strong)',
      boxShadow: '0 0 0 5px rgba(32, 106, 94, 0.12)',
      border: '2px solid rgba(255, 255, 255, 0.95)',
    }
  }

  return {
    background: 'rgba(24, 29, 30, 0.12)',
    border: '2px solid rgba(95, 86, 71, 0.18)',
    boxShadow: 'none',
  }
}

export function TimelineItem({ item, state, isLast }: TimelineItemProps) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '24px minmax(0, 1fr)', gap: '16px' }}>
      <div style={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
        <span
          aria-hidden="true"
          style={{
            width: '12px',
            height: '12px',
            borderRadius: '999px',
            marginTop: '8px',
            ...getDotStyle(state, item.highlight),
          }}
        />
        {!isLast ? (
          <span
            aria-hidden="true"
            style={{
              position: 'absolute',
              top: '26px',
              bottom: '-18px',
              width: '2px',
              background: state === 'upcoming' ? 'rgba(95, 86, 71, 0.16)' : 'rgba(32, 106, 94, 0.16)',
            }}
          />
        ) : null}
      </div>

      <article
        style={{
          padding: '16px',
          borderRadius: '18px',
          border:
            state === 'current'
              ? '1px solid rgba(178, 95, 69, 0.24)'
              : item.highlight
                ? '1px solid rgba(32, 106, 94, 0.22)'
                : '1px solid var(--color-border-soft)',
          background:
            state === 'current'
              ? 'rgba(252, 241, 236, 0.84)'
              : item.highlight
                ? 'rgba(229, 241, 238, 0.76)'
                : 'rgba(255, 255, 255, 0.76)',
          opacity: state === 'upcoming' ? 0.72 : 1,
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: '12px',
            alignItems: 'center',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-text)' }}>{item.label}</div>
          <div
            style={{
              fontFamily: 'var(--font-mono), IBM Plex Mono, monospace',
              fontSize: '0.8rem',
              color: 'var(--color-text-muted)',
            }}
          >
            {item.timestamp}
          </div>
        </div>

        <div style={{ marginTop: '8px', fontSize: '0.88rem', fontWeight: 600, color: 'var(--color-text-soft)' }}>
          {item.actor}
        </div>

        <div style={{ marginTop: '10px', lineHeight: 1.65, color: 'var(--color-text)' }}>{item.detail}</div>
      </article>
    </div>
  )
}
