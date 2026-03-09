import { timelineScenarioMap } from '../../mock/timeline'
import type { AIAnalysisResult, IndustryId, TimelineData } from '../../lib/types'

type OwnershipFlowCardProps = {
  industryId: IndustryId
  data: TimelineData | null
  result: AIAnalysisResult | null
}

export function OwnershipFlowCard({ industryId, data, result }: OwnershipFlowCardProps) {
  const scenario = timelineScenarioMap[industryId]

  if (!data || !result) {
    return (
      <article className="placeholder-panel">
        <span className="panel-kicker">Ownership</span>
        <h3 className="panel-title">责任归属</h3>
        <p className="panel-description">
          解析完成后，这里会说明当前该谁接、下一步该谁盯，以及为什么这个责任人是合理的。
        </p>
      </article>
    )
  }

  return (
    <article className="placeholder-panel">
      <span className="panel-kicker">Ownership</span>
      <h3 className="panel-title">责任归属与推进路径</h3>
      <p className="panel-description">
        对管理者来说，最重要的不是系统识别了什么，而是：现在谁该接、谁该被提醒、什么时候必须升级。
      </p>

      <div style={{ display: 'grid', gap: '12px' }}>
        <div style={cardStyle(false)}>
          <div style={labelStyle}>当前责任团队</div>
          <div style={valueStyle}>{data.ownerTeam}</div>
          <div style={subtleStyle}>{scenario.ownershipNote}</div>
        </div>

        <div style={cardStyle(false)}>
          <div style={labelStyle}>AI 路由依据</div>
          <div style={subtleStyle}>{result.reason}</div>
        </div>

        <div style={cardStyle(true)}>
          <div style={labelStyle}>下一步推进动作</div>
          <div style={valueStyle}>确认接单并在 {result.suggested_sla} 内更新进展</div>
          <div style={subtleStyle}>如果无人响应，系统会把异常继续抬升给 {timelineScenarioMap[industryId].escalationActor}。</div>
        </div>
      </div>
    </article>
  )
}

const labelStyle = {
  fontSize: '0.78rem',
  fontWeight: 700,
  color: 'var(--color-text-muted)',
}

const valueStyle = {
  marginTop: '8px',
  fontSize: '1rem',
  fontWeight: 700,
  color: 'var(--color-text)',
  lineHeight: 1.55,
}

const subtleStyle = {
  marginTop: '8px',
  color: 'var(--color-text-soft)',
  lineHeight: 1.65,
}

function cardStyle(isAccent: boolean) {
  return {
    padding: '16px',
    borderRadius: '18px',
    border: isAccent ? '1px solid rgba(178, 95, 69, 0.22)' : '1px solid var(--color-border-soft)',
    background: isAccent ? 'rgba(252, 241, 236, 0.82)' : 'rgba(255, 255, 255, 0.74)',
  }
}
