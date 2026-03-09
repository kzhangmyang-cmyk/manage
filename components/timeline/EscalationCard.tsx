import { timelineScenarioMap } from '../../mock/timeline'
import type { AIAnalysisResult, IndustryId, TimelineData } from '../../lib/types'

type EscalationCardProps = {
  industryId: IndustryId
  data: TimelineData | null
  result: AIAnalysisResult | null
}

export function EscalationCard({ industryId, data, result }: EscalationCardProps) {
  const scenario = timelineScenarioMap[industryId]

  if (!data || !result) {
    return (
      <article className="placeholder-panel">
        <span className="panel-kicker">Escalation</span>
        <h3 className="panel-title">超时升级</h3>
        <p className="panel-description">
          完成 AI 解析后，这里会展示当前 SLA 窗口、是否已经升级，以及下一次升级会推送给谁。
        </p>
      </article>
    )
  }

  const escalationLabel =
    data.escalationStatus === 'escalated'
      ? '已升级'
      : data.escalationStatus === 'watching'
        ? '监控中'
        : '未触发'

  return (
    <article className="placeholder-panel">
      <span className="panel-kicker">Escalation</span>
      <h3 className="panel-title">超时升级状态</h3>
      <p className="panel-description">
        manage 会盯住时间窗，而不是把问题丢给管理者自己追。当前这件事的升级逻辑已经被明确写出来了。
      </p>

      <div style={{ display: 'grid', gap: '12px' }}>
        <div style={cardStyle(false)}>
          <div style={labelStyle}>当前升级状态</div>
          <div style={valueStyle}>{escalationLabel}</div>
        </div>

        <div style={cardStyle(false)}>
          <div style={labelStyle}>建议响应时限</div>
          <div style={valueStyle}>{result.suggested_sla}</div>
          <div style={subtleStyle}>SLA 截止：{data.slaDeadline}</div>
        </div>

        <div style={cardStyle(true)}>
          <div style={labelStyle}>升级去向</div>
          <div style={valueStyle}>{scenario.escalationActor}</div>
          <div style={subtleStyle}>{scenario.escalationNote}</div>
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
}

const subtleStyle = {
  marginTop: '8px',
  lineHeight: 1.6,
  color: 'var(--color-text-soft)',
}

function cardStyle(isAccent: boolean) {
  return {
    padding: '16px',
    borderRadius: '18px',
    border: isAccent ? '1px solid rgba(32, 106, 94, 0.22)' : '1px solid var(--color-border-soft)',
    background: isAccent ? 'rgba(229, 241, 238, 0.8)' : 'rgba(255, 255, 255, 0.74)',
  }
}
