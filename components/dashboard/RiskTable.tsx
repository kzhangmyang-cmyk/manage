import type { DashboardData } from '../../lib/types'

type RiskTableProps = {
  data: DashboardData | null
}

export function RiskTable({ data }: RiskTableProps) {
  return (
    <article className="placeholder-panel span-7">
      <span className="panel-kicker">Risk list</span>
      <h3 className="panel-title">当前最需要管理者关注的事项</h3>
      <p className="panel-description">
        这不是功能清单，而是管理清单。它回答的是：现在最该盯哪几件事、责任人是谁、下一步该做什么。
      </p>

      {data ? (
        <div className="risk-table">
          <div className="risk-table-header">
            <span>事项</span>
            <span>优先级</span>
            <span>责任人</span>
            <span>状态</span>
            <span>下一步</span>
          </div>

          {data.riskList.map((risk) => (
            <div key={risk.id} className="risk-table-row">
              <div className="risk-table-cell risk-table-main" data-label="事项">
                <div style={{ fontWeight: 700, color: 'var(--color-text)' }}>{risk.title}</div>
                <div style={metaStyle}>
                  {risk.category} · {risk.ageLabel}
                </div>
                {risk.pathLabel || risk.actionLabel ? (
                  <div className="panel-chips" style={{ marginTop: '8px' }}>
                    {risk.pathLabel ? <span className="panel-chip">路径：{risk.pathLabel}</span> : null}
                    {risk.actionLabel ? <span className="panel-chip">动作：{risk.actionLabel}</span> : null}
                  </div>
                ) : null}
              </div>
              <div className="risk-table-cell" data-label="优先级" style={cellStyle}>
                {risk.priority}
              </div>
              <div className="risk-table-cell" data-label="责任人" style={cellStyle}>
                {risk.owner}
              </div>
              <div className="risk-table-cell" data-label="状态" style={cellStyle}>
                {labelForEscalation(risk.escalationStatus)}
              </div>
              <div className="risk-table-cell" data-label="下一步" style={cellStyle}>
                {risk.nextAction}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={emptyStyle}>完成一次 AI 解析后，这里会生成风险清单和建议动作。</div>
      )}
    </article>
  )
}

const metaStyle = {
  marginTop: '6px',
  fontSize: '0.88rem',
  color: 'var(--color-text-soft)',
}

const cellStyle = {
  color: 'var(--color-text)',
  lineHeight: 1.6,
}

const emptyStyle = {
  padding: '16px',
  borderRadius: '18px',
  border: '1px solid var(--color-border-soft)',
  background: 'rgba(255, 255, 255, 0.74)',
  color: 'var(--color-text-soft)',
}

function labelForEscalation(status: DashboardData['riskList'][number]['escalationStatus']) {
  if (status === 'escalated') {
    return '已升级'
  }

  if (status === 'watching') {
    return '监控中'
  }

  if (status === 'resolved') {
    return '已关闭'
  }

  return '未触发'
}
