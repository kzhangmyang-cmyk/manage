import { derivePrimaryAction, getTimelineOrder } from '../../lib/demo-flow'
import type { AIAnalysisResult, TimelineData } from '../../lib/types'
import { TimelineItem } from './TimelineItem'

type TimelinePanelProps = {
  data: TimelineData | null
  result: AIAnalysisResult | null
  issueText: string
}

export function TimelinePanel({ data, result, issueText }: TimelinePanelProps) {
  if (!data || !result) {
    return (
      <article className="placeholder-panel is-primary">
        <span className="panel-kicker">Issue flow</span>
        <h3 className="panel-title">流转时间线</h3>
        <p className="panel-description">
          先完成一次 AI 解析后，这里会把问题从提交、分配、待响应到升级和处理中串成一条可读的时间线。
        </p>
        <div className="panel-chips">
          <span className="panel-chip">submitted</span>
          <span className="panel-chip">assigned</span>
          <span className="panel-chip">escalated</span>
        </div>
      </article>
    )
  }

  const order = getTimelineOrder()
  const currentIndex = order.indexOf(data.currentStatus)
  const actionLabel = derivePrimaryAction(issueText, result.recommended_path)

  return (
    <article className="placeholder-panel is-primary">
      <span className="panel-kicker">Issue flow</span>
      <h3 className="panel-title">这件事现在推进到哪了</h3>
      <p className="panel-description">
        这条时间线不是为了展示流程有多复杂，而是为了让管理者一眼看清：问题有没有被接住，AI 有没有先做事，什么时候该升级。
      </p>

      <div className="panel-chips">
        <span className="panel-chip">当前状态：{labelForStatus(data.currentStatus)}</span>
        <span className="panel-chip">责任团队：{data.ownerTeam}</span>
        <span className="panel-chip">SLA 截止：{data.slaDeadline}</span>
        <span className="panel-chip">升级状态：{labelForEscalation(data.escalationStatus)}</span>
        <span className="panel-chip">推荐路径：{result.recommended_path}</span>
        <span className="panel-chip">当前动作：{actionLabel}</span>
      </div>

      <div
        style={{
          marginTop: '18px',
          padding: '16px',
          borderRadius: '18px',
          border: '1px solid rgba(32, 106, 94, 0.22)',
          background:
            result.recommended_path === '升级人工'
              ? 'rgba(252, 241, 236, 0.82)'
              : result.recommended_path === '建议确认'
                ? 'rgba(248, 240, 216, 0.82)'
                : 'rgba(229, 241, 238, 0.82)',
        }}
      >
        <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-text-muted)' }}>
          老板当前最该知道
        </div>
        <div style={{ marginTop: '8px', fontWeight: 700, color: 'var(--color-text)' }}>
          {buildActionSummary(result, actionLabel)}
        </div>
        <div style={{ marginTop: '8px', lineHeight: 1.65, color: 'var(--color-text-soft)' }}>
          {buildActionDetail(result, actionLabel, data.ownerTeam)}
        </div>
      </div>

      <div style={{ display: 'grid', gap: '16px', marginTop: '20px' }}>
        {data.timelineItems.map((item, index) => {
          const itemIndex = order.indexOf(item.statusKey)
          const state =
            itemIndex < currentIndex ? 'done' : itemIndex === currentIndex ? 'current' : 'upcoming'

          return (
            <TimelineItem
              key={item.id}
              item={item}
              state={state}
              isLast={index === data.timelineItems.length - 1}
            />
          )
        })}
      </div>
    </article>
  )
}

function buildActionSummary(
  result: AIAnalysisResult,
  actionLabel: ReturnType<typeof derivePrimaryAction>,
) {
  if (result.recommended_path === '自动完成') {
    return `AI 已先执行 ${actionLabel}，这类低风险事项已经先被系统处理掉，不需要管理者再追。`
  }

  if (result.recommended_path === '建议确认') {
    return `AI 已先给出 ${actionLabel}，当前等待负责人确认，管理者看到的是推进状态而不是零散消息。`
  }

  return `AI 已识别这件事不适合自动完成，当前动作是 ${actionLabel}，问题已经被推向人工处理。`
}

function buildActionDetail(
  result: AIAnalysisResult,
  actionLabel: ReturnType<typeof derivePrimaryAction>,
  ownerTeam: string,
) {
  if (result.recommended_path === '自动完成') {
    return `系统会把 ${actionLabel} 的结果和状态更新同步写入执行日志，再把结果回推给 ${ownerTeam} 和管理者看板。老板看到的将不只是“已处理”，而是“AI 做了什么”。`
  }

  if (result.recommended_path === '建议确认') {
    return `系统已经把建议动作准备好，接下来由 ${ownerTeam} 确认后执行，确认前后的每一步都会被记录，避免责任和状态再次漂在群里。`
  }

  return `系统会先完成提醒与升级准备，然后把问题交给 ${ownerTeam} 或上级负责人接手，避免 AI 越权处理，也避免风险继续被动扩大。`
}

function labelForEscalation(status: TimelineData['escalationStatus']) {
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

function labelForStatus(status: TimelineData['currentStatus']) {
  switch (status) {
    case 'submitted':
      return '已提交'
    case 'assigned':
      return '已分配'
    case 'pending_response':
      return '待响应'
    case 'escalated':
      return '已升级'
    case 'in_progress':
      return '处理中'
    case 'resolved':
      return '已处理'
  }
}
