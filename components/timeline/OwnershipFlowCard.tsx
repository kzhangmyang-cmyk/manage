import { derivePrimaryAction } from '../../lib/demo-flow'
import { timelineScenarioMap } from '../../mock/timeline'
import type { AIAnalysisResult, IndustryId, TimelineData } from '../../lib/types'

type OwnershipFlowCardProps = {
  industryId: IndustryId
  data: TimelineData | null
  result: AIAnalysisResult | null
  issueText: string
}

export function OwnershipFlowCard({ industryId, data, result, issueText }: OwnershipFlowCardProps) {
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

  const actionLabel = derivePrimaryAction(issueText, result.recommended_path)

  return (
    <article className="placeholder-panel">
      <span className="panel-kicker">Ownership</span>
      <h3 className="panel-title">现在谁负责，AI 先做什么</h3>
      <p className="panel-description">
        对管理者来说，最重要的不是系统识别了什么，而是：现在谁该接，AI 已经先做了什么，什么时候必须升级。
      </p>

      <div style={{ display: 'grid', gap: '12px' }}>
        <div style={cardStyle(false)}>
          <div style={labelStyle}>当前主要责任团队</div>
          <div style={valueStyle}>{data.ownerTeam}</div>
          <div style={subtleStyle}>{scenario.ownershipNote}</div>
        </div>

        <div style={cardStyle(false)}>
          <div style={labelStyle}>AI 已先执行的动作</div>
          <div style={valueStyle}>{actionLabel}</div>
          <div style={subtleStyle}>{buildActionOwnershipCopy(result, actionLabel, data.ownerTeam)}</div>
        </div>

        <div style={cardStyle(false)}>
          <div style={labelStyle}>AI 路由依据</div>
          <div style={subtleStyle}>{result.reason}</div>
        </div>

        <div style={cardStyle(true)}>
          <div style={labelStyle}>管理者接下来要盯的点</div>
          <div style={valueStyle}>{buildNextStepHeadline(result, actionLabel)}</div>
          <div style={subtleStyle}>{buildNextStepDetail(result, industryId, data.ownerTeam)}</div>
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

function buildActionOwnershipCopy(
  result: AIAnalysisResult,
  actionLabel: ReturnType<typeof derivePrimaryAction>,
  ownerTeam: string,
) {
  if (result.recommended_path === '自动完成') {
    return `当前由 AI Agent 先执行 ${actionLabel}，${ownerTeam} 主要负责接收结果或处理例外情况。管理者不需要再为这类低风险事项持续追人。`
  }

  if (result.recommended_path === '建议确认') {
    return `当前由 AI 先准备 ${actionLabel}，${ownerTeam} 负责做最终确认并决定是否落地执行。这样管理者看到的是“确认是否推进”，而不是“谁都没动”。`
  }

  return `当前由 AI 先完成 ${actionLabel} 的准备动作，随后交由 ${ownerTeam} 或上级负责人接手，确保高风险事项尽快进入人工链路。`
}

function buildNextStepHeadline(
  result: AIAnalysisResult,
  actionLabel: ReturnType<typeof derivePrimaryAction>,
) {
  if (result.recommended_path === '自动完成') {
    return `确认 ${actionLabel} 的结果是否已同步到管理视图`
  }

  if (result.recommended_path === '建议确认') {
    return `确认 ${actionLabel} 是否落地，并在 ${result.suggested_sla} 内反馈`
  }

  return `确认人工接手是否及时，并继续升级给负责人`
}

function buildNextStepDetail(result: AIAnalysisResult, industryId: IndustryId, ownerTeam: string) {
  if (result.recommended_path === '自动完成') {
    return '系统会把动作结果直接同步进管理者看板，确保老板看到的不是“待办”，而是“AI 已经完成了什么”。'
  }

  if (result.recommended_path === '建议确认') {
    return `如果 ${ownerTeam} 未在 ${result.suggested_sla} 内确认，系统会继续提醒并把状态写入执行日志，避免管理者又回到人工催办。`
  }

  return `如果无人响应，系统会把异常继续抬升给 ${timelineScenarioMap[industryId].escalationActor}，直到问题进入明确负责人的视野。`
}
