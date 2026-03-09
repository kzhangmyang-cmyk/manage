import type { DashboardData } from '../../lib/types'

type FocusItemCardProps = {
  data: DashboardData | null
}

export function FocusItemCard({ data }: FocusItemCardProps) {
  const primary = data?.focusItems[0]
  const secondary = data?.focusItems.slice(1) ?? []

  return (
    <article className="placeholder-panel span-5">
      <span className="panel-kicker">Focus item</span>
      <h3 className="panel-title">当前最需要关注的事项</h3>
      <p className="panel-description">
        这里不试图列出全部问题，而是用一个最值得先看的主事项，帮助管理者快速收敛注意力。
      </p>

      {primary ? (
        <>
          <div
            style={{
              padding: '16px',
              borderRadius: '18px',
              border: '1px solid rgba(178, 95, 69, 0.22)',
              background: 'rgba(252, 241, 236, 0.82)',
            }}
          >
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-text-muted)' }}>
              Primary focus
            </div>
            <div style={{ marginTop: '8px', fontSize: '1.08rem', fontWeight: 700, color: 'var(--color-text)' }}>
              {primary.title}
            </div>
            <div style={{ marginTop: '8px', color: 'var(--color-text-soft)', lineHeight: 1.65 }}>
              {primary.riskNote}
            </div>
            <div className="panel-chips" style={{ marginTop: '14px' }}>
              <span className="panel-chip">{primary.priority}</span>
              <span className="panel-chip">{primary.owner}</span>
              <span className="panel-chip">{primary.status}</span>
              {primary.pathLabel ? <span className="panel-chip">{primary.pathLabel}</span> : null}
              {primary.actionLabel ? <span className="panel-chip">{primary.actionLabel}</span> : null}
            </div>
          </div>

          {secondary.length > 0 ? (
            <div style={{ display: 'grid', gap: '10px', marginTop: '14px' }}>
              {secondary.map((item) => (
                <div
                  key={item.id}
                  style={{
                    padding: '14px',
                    borderRadius: '16px',
                    border: '1px solid var(--color-border-soft)',
                    background: 'rgba(255, 255, 255, 0.74)',
                  }}
                >
                  <div style={{ fontWeight: 700, color: 'var(--color-text)' }}>{item.title}</div>
                  <div style={{ marginTop: '6px', fontSize: '0.9rem', color: 'var(--color-text-soft)' }}>
                    {item.riskNote}
                  </div>
                  {item.pathLabel || item.actionLabel ? (
                    <div className="panel-chips" style={{ marginTop: '10px' }}>
                      {item.pathLabel ? <span className="panel-chip">{item.pathLabel}</span> : null}
                      {item.actionLabel ? <span className="panel-chip">{item.actionLabel}</span> : null}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}
        </>
      ) : (
        <div style={emptyStyle}>完成一次 AI 解析后，这里会自动挑出最值得管理者先看的事项。</div>
      )}
    </article>
  )
}

const emptyStyle = {
  padding: '16px',
  borderRadius: '18px',
  border: '1px solid var(--color-border-soft)',
  background: 'rgba(255, 255, 255, 0.74)',
  color: 'var(--color-text-soft)',
}
