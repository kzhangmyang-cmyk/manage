import type { DashboardData } from '../../lib/types'

type RiskBoardProps = {
  data: DashboardData | null
}

export function RiskBoard({ data }: RiskBoardProps) {
  const metrics = data
    ? [
        { label: '今日高风险异常', value: String(data.highRiskCount), note: '优先级为高的问题数量' },
        { label: '超时事项', value: String(data.overdueCount), note: '已升级或需要立即干预' },
        { label: '重点关注事项', value: String(data.focusItemCount), note: '当前最值得管理者先盯住的条目' },
        { label: '处理中事项', value: String(data.inProgressCount), note: '当前仍在推进中的风险与请求' },
      ]
    : [
        { label: '今日高风险异常', value: '--', note: '完成一次 AI 解析后生成' },
        { label: '超时事项', value: '--', note: '完成一次 AI 解析后生成' },
        { label: '重点关注事项', value: '--', note: '完成一次 AI 解析后生成' },
        { label: '处理中事项', value: '--', note: '完成一次 AI 解析后生成' },
      ]

  return (
    <>
      {metrics.map((metric) => (
        <article key={metric.label} className="placeholder-panel span-3">
          <span className="panel-kicker">Metric</span>
          <h3 className="panel-title">{metric.label}</h3>
          <div
            style={{
              marginTop: '18px',
              fontSize: '2.4rem',
              lineHeight: 1,
              letterSpacing: '-0.05em',
              fontWeight: 700,
              color: 'var(--color-text)',
            }}
          >
            {metric.value}
          </div>
          <p className="panel-description" style={{ marginBottom: 0 }}>
            {metric.note}
          </p>
        </article>
      ))}
    </>
  )
}
