import type { CSSProperties } from 'react'

type AntiSurveillanceNoticeProps = {
  antiSurveillanceCopy: string
  withoutManageCopy: string
  resultCopy: string
}

const blockStyle: CSSProperties = {
  padding: '16px 18px',
  borderRadius: '18px',
  background: 'rgba(255, 255, 255, 0.7)',
  border: '1px solid var(--color-border-soft)',
}

export function AntiSurveillanceNotice({
  antiSurveillanceCopy,
  withoutManageCopy,
  resultCopy,
}: AntiSurveillanceNoticeProps) {
  return (
    <article className="placeholder-panel">
      <span className="panel-kicker">Trust narrative</span>
      <h3 className="panel-title">先把产品边界说清楚</h3>
      <p className="panel-description">
        这一块不讲功能堆砌，先明确 manage 的立场：它不是监控系统，而是帮助管理者推动事情往前走。
      </p>

      <div style={{ display: 'grid', gap: '12px' }}>
        <section style={blockStyle}>
          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-text-muted)' }}>
            反监控声明
          </div>
          <div style={{ marginTop: '8px', lineHeight: 1.65 }}>{antiSurveillanceCopy}</div>
        </section>

        <section style={blockStyle}>
          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-text-muted)' }}>
            没有 manage 时
          </div>
          <div style={{ marginTop: '8px', lineHeight: 1.65 }}>{withoutManageCopy}</div>
        </section>

        <section
          style={{
            ...blockStyle,
            background: 'rgba(229, 241, 238, 0.82)',
            border: '1px solid rgba(32, 106, 94, 0.22)',
          }}
        >
          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-text-muted)' }}>
            管理结果导向
          </div>
          <div style={{ marginTop: '8px', lineHeight: 1.65 }}>{resultCopy}</div>
        </section>
      </div>
    </article>
  )
}
