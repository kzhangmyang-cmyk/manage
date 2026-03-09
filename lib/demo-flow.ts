import { dashboardSeedMap } from '../mock/dashboard'
import { timelineScenarioMap } from '../mock/timeline'
import type {
  AIAnalysisResult,
  DashboardData,
  EscalationStatus,
  IndustryId,
  TimelineData,
  TimelineStatusKey,
} from './types'

type BuildTimelineDataInput = {
  industryId: IndustryId
  issueId: string
  issueText: string
  analysisResult: AIAnalysisResult
}

export function buildTimelineData({
  industryId,
  issueId,
  issueText,
  analysisResult,
}: BuildTimelineDataInput): TimelineData {
  const scenario = timelineScenarioMap[industryId]
  const now = new Date()
  const slaMinutes = parseSlaMinutes(analysisResult.suggested_sla)
  const currentStatus = getCurrentStatus(analysisResult.priority)
  const escalationStatus = getEscalationStatus(analysisResult.priority)

  const submittedAt = addMinutes(now, -18)
  const assignedAt = addMinutes(now, -14)
  const pendingAt = addMinutes(now, -11)
  const escalatedAt = addMinutes(now, -6)
  const inProgressAt = addMinutes(now, -3)
  const resolvedAt = addMinutes(now, 20)
  const slaDeadline = addMinutes(submittedAt, slaMinutes)

  return {
    issueId,
    currentStatus,
    escalationStatus,
    ownerTeam: analysisResult.recommended_owner,
    slaDeadline: formatDateLabel(slaDeadline),
    timelineItems: [
      {
        id: `${issueId}-submitted`,
        statusKey: 'submitted',
        label: '已提交',
        timestamp: formatDateLabel(submittedAt),
        actor: scenario.submittedActor,
        detail: `问题已进入统一流转视图：${summarizeIssue(issueText)}`,
      },
      {
        id: `${issueId}-assigned`,
        statusKey: 'assigned',
        label: '已分配',
        timestamp: formatDateLabel(assignedAt),
        actor: scenario.assignmentActor,
        detail: `AI 已识别为 ${analysisResult.category}，建议优先路由到 ${analysisResult.recommended_owner}。`,
      },
      {
        id: `${issueId}-pending`,
        statusKey: 'pending_response',
        label: '待响应',
        timestamp: formatDateLabel(pendingAt),
        actor: analysisResult.recommended_owner,
        detail: `已启动 ${analysisResult.suggested_sla} 响应窗口，系统正在持续观察是否超时。`,
        highlight: currentStatus === 'pending_response',
      },
      {
        id: `${issueId}-escalated`,
        statusKey: 'escalated',
        label: '已升级',
        timestamp:
          escalationStatus === 'escalated'
            ? formatDateLabel(escalatedAt)
            : `若超时后（${analysisResult.suggested_sla}）`,
        actor: scenario.escalationActor,
        detail:
          escalationStatus === 'escalated'
            ? `由于优先级 ${analysisResult.priority} 且影响范围持续扩大，系统已升级给 ${scenario.escalationActor}。`
            : `若 ${analysisResult.recommended_owner} 在 ${analysisResult.suggested_sla} 内仍未推进，将自动升级给 ${scenario.escalationActor}。`,
        highlight: escalationStatus !== 'none',
      },
      {
        id: `${issueId}-progress`,
        statusKey: 'in_progress',
        label: '处理中',
        timestamp:
          currentStatus === 'in_progress' || currentStatus === 'resolved'
            ? formatDateLabel(inProgressAt)
            : '等待上一节点完成',
        actor: analysisResult.recommended_owner,
        detail:
          currentStatus === 'in_progress' || currentStatus === 'resolved'
            ? `${analysisResult.recommended_owner} 已接手，正在按照 ${analysisResult.suggested_sla} 窗口推进处理。`
            : '责任团队完成接单后，将进入处理中并同步更新管理摘要。',
        highlight: currentStatus === 'in_progress',
      },
      {
        id: `${issueId}-resolved`,
        statusKey: 'resolved',
        label: '已处理',
        timestamp: currentStatus === 'resolved' ? formatDateLabel(resolvedAt) : '待处理完成',
        actor: scenario.assignmentActor,
        detail: '问题关闭后将同步进入管理摘要与风险回顾，便于管理者看到结果。',
      },
    ],
  }
}

export function getTimelineOrder(): TimelineStatusKey[] {
  return ['submitted', 'assigned', 'pending_response', 'escalated', 'in_progress', 'resolved']
}

type BuildDashboardDataInput = {
  industryId: IndustryId
  issueId: string
  issueText: string
  analysisResult: AIAnalysisResult
  timelineData: TimelineData
}

export function buildDashboardData({
  industryId,
  issueId,
  issueText,
  analysisResult,
  timelineData,
}: BuildDashboardDataInput): DashboardData {
  const seed = dashboardSeedMap[industryId]
  const primaryRisk = {
    id: `${issueId}-primary`,
    title: summarizeIssue(issueText),
    category: analysisResult.category,
    priority: analysisResult.priority,
    owner: analysisResult.recommended_owner,
    ageLabel: '18 分钟',
    escalationStatus: timelineData.escalationStatus,
    nextAction: buildNextAction(analysisResult, timelineData),
  }

  const riskList = [primaryRisk, ...seed.backgroundRisks]
  const departmentBacklog = tuneDepartmentBacklog(
    seed.departmentBacklog,
    analysisResult.recommended_owner,
    analysisResult.priority,
    timelineData.escalationStatus,
  )

  const focusItems = [
    {
      id: `${issueId}-focus-primary`,
      title: primaryRisk.title,
      priority: analysisResult.priority,
      owner: analysisResult.recommended_owner,
      riskNote: `${analysisResult.impact} 当前状态：${labelForStatus(timelineData.currentStatus)}。`,
      status: labelForStatus(timelineData.currentStatus),
    },
    ...seed.backgroundRisks.slice(0, 2).map((risk, index) => ({
      id: `${issueId}-focus-seed-${index}`,
      title: risk.title,
      priority: risk.priority,
      owner: risk.owner,
      riskNote: risk.nextAction,
      status: risk.escalationStatus === 'escalated' ? '已升级' : '关注中',
    })),
  ]

  return {
    highRiskCount: riskList.filter((risk) => risk.priority === '高').length,
    overdueCount: riskList.filter((risk) => risk.escalationStatus === 'escalated').length,
    inProgressCount: riskList.filter((risk) => risk.escalationStatus !== 'resolved').length,
    focusItemCount: focusItems.length,
    focusItems,
    departmentBacklog,
    riskList,
    managerSummary: buildManagerSummary(seed.summaryLead, seed.focusPrompts, analysisResult, timelineData),
  }
}

function getCurrentStatus(priority: string): TimelineStatusKey {
  if (priority === '高') {
    return 'in_progress'
  }

  if (priority === '中') {
    return 'pending_response'
  }

  return 'assigned'
}

function getEscalationStatus(priority: string): EscalationStatus {
  if (priority === '高') {
    return 'escalated'
  }

  if (priority === '中') {
    return 'watching'
  }

  return 'none'
}

function parseSlaMinutes(value: string): number {
  const normalized = value.trim()

  if (!normalized) {
    return 120
  }

  const hourMatch = normalized.match(/(\d+)\s*小时/)

  if (hourMatch) {
    return Number(hourMatch[1]) * 60
  }

  const minuteMatch = normalized.match(/(\d+)\s*分钟/)

  if (minuteMatch) {
    return Number(minuteMatch[1])
  }

  return 120
}

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60 * 1000)
}

function formatDateLabel(date: Date) {
  const time = date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  })

  return `今天 ${time}`
}

function summarizeIssue(text: string) {
  if (text.length <= 48) {
    return text
  }

  return `${text.slice(0, 48)}...`
}

function tuneDepartmentBacklog(
  items: DashboardData['departmentBacklog'],
  owner: string,
  priority: string,
  escalationStatus: EscalationStatus,
) {
  return items.map((item) => {
    if (!owner.includes(item.department) && !item.department.includes(owner)) {
      return item
    }

    return {
      ...item,
      openCount: item.openCount + 1,
      overdueCount: item.overdueCount + (escalationStatus === 'escalated' ? 1 : 0),
      riskLevel: priority === '高' ? 'high' : item.riskLevel,
    }
  })
}

function buildNextAction(analysisResult: AIAnalysisResult, timelineData: TimelineData) {
  if (timelineData.escalationStatus === 'escalated') {
    return `要求 ${analysisResult.recommended_owner} 立即更新处理进展，并同步管理者升级结论`
  }

  if (timelineData.currentStatus === 'pending_response') {
    return `在 ${analysisResult.suggested_sla} 内确认是否接单，否则自动升级`
  }

  return `继续由 ${analysisResult.recommended_owner} 推进，并在下一个节点同步状态`
}

function buildManagerSummary(
  lead: string,
  focusPrompts: string[],
  analysisResult: AIAnalysisResult,
  timelineData: TimelineData,
) {
  const escalationText =
    timelineData.escalationStatus === 'escalated'
      ? '当前这条问题已经进入升级状态'
      : timelineData.escalationStatus === 'watching'
        ? '当前这条问题已经进入超时监控窗口'
        : '当前这条问题仍处于责任团队接单阶段'

  return `${lead}${escalationText}，由 ${analysisResult.recommended_owner} 承接，建议在 ${analysisResult.suggested_sla} 内完成关键反馈。管理者此刻最该关注的是：${focusPrompts.join('；')}。`
}

function labelForStatus(status: TimelineStatusKey) {
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
