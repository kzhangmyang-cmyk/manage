import type { DashboardData } from '../../lib/types'

type RiskBoardProps = {
  data: DashboardData | null
}

export function RiskBoard({ data }: RiskBoardProps) {
  const metrics = data
    ? [
        { label: '已提前暴露的高风险', value: String(data.highRiskCount), note: '老板现在就该盯住的问题数量' },
        { label: '已经升级 / 超时', value: String(data.overdueCount), note: '已进入管理干预窗口' },
        { label: '还在等确认', value: String(data.pendingConfirmationCount), note: '系统已给建议，但还没被最终拍板' },
        { label: 'AI 已先完成', value: String(data.autoCompletedCount), note: '低风险标准动作已经先做掉了' },
      ]
    : [
        { label: '已提前暴露的高风险', value: '--', note: '完成一次 AI 解析后生成' },
        { label: '已经升级 / 超时', value: '--', note: '完成一次 AI 解析后生成' },
        { label: '还在等确认', value: '--', note: '完成一次 AI 解析后生成' },
        { label: 'AI 已先完成', value: '--', note: '完成一次 AI 解析后生成' },
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
