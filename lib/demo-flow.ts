import { dashboardSeedMap } from '../mock/dashboard'
import { timelineScenarioMap } from '../mock/timeline'
import type {
  AIAnalysisResult,
  AutomationActionKind,
  DashboardData,
  EscalationStatus,
  ExecutionLogEntry,
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
  const currentStatus = getCurrentStatus(analysisResult)
  const escalationStatus = getEscalationStatus(analysisResult)
  const primaryAction = derivePrimaryAction(issueText, analysisResult.recommended_path)

  const submittedAt = addMinutes(now, -18)
  const assignedAt = addMinutes(now, -14)
  const pendingAt = addMinutes(now, -11)
  const escalatedAt = addMinutes(now, -6)
  const inProgressAt = addMinutes(now, -3)
  const resolvedAt = addMinutes(now, -1)
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
        timestamp:
          analysisResult.recommended_path === '自动完成'
            ? '已跳过人工接单'
            : formatDateLabel(pendingAt),
        actor: analysisResult.recommended_owner,
        detail:
          analysisResult.recommended_path === '自动完成'
            ? `系统判断可先由 AI 执行 ${primaryAction}，无需进入人工待响应阶段。`
            : `已启动 ${analysisResult.suggested_sla} 响应窗口，系统正在持续观察是否超时。`,
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
          analysisResult.recommended_path === '自动完成'
            ? '该问题已在低风险范围内由 AI 完成，不进入升级路径。'
            : escalationStatus === 'escalated'
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
          analysisResult.recommended_path === '自动完成'
            ? `AI 已执行 ${primaryAction}，并自动更新当前问题状态。`
            : currentStatus === 'in_progress' || currentStatus === 'resolved'
            ? `${analysisResult.recommended_owner} 已接手，正在按照 ${analysisResult.suggested_sla} 窗口推进处理。`
            : '责任团队完成接单后，将进入处理中并同步更新管理摘要。',
        highlight: currentStatus === 'in_progress',
      },
      {
        id: `${issueId}-resolved`,
        statusKey: 'resolved',
        label: '已处理',
        timestamp: currentStatus === 'resolved' ? formatDateLabel(resolvedAt) : '待处理完成',
        actor: analysisResult.recommended_path === '自动完成' ? 'manage AI Ops Agent' : scenario.assignmentActor,
        detail:
          analysisResult.recommended_path === '自动完成'
            ? `已自动完成 ${primaryAction}，并把结果同步进管理摘要与执行日志。`
            : '问题关闭后将同步进入管理摘要与风险回顾，便于管理者看到结果。',
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
  const primaryAction = derivePrimaryAction(issueText, analysisResult.recommended_path)
  const executionLogs = buildExecutionLogs({
    issueId,
    issueText,
    industryId,
    analysisResult,
    timelineData,
  })
  const primaryRisk = {
    id: `${issueId}-primary`,
    title: summarizeIssue(issueText),
    category: analysisResult.category,
    priority: analysisResult.priority,
    owner: analysisResult.recommended_owner,
    ageLabel: '18 分钟',
    escalationStatus: deriveRiskEscalationStatus(analysisResult, timelineData),
    nextAction: buildNextAction(analysisResult, timelineData),
    pathLabel: analysisResult.recommended_path,
    actionLabel: primaryAction,
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
      riskNote: `${analysisResult.impact} 当前状态：${labelForStatus(timelineData.currentStatus)}。当前动作：${primaryAction}。`,
      status: labelForStatus(timelineData.currentStatus),
      pathLabel: analysisResult.recommended_path,
      actionLabel: primaryAction,
    },
    ...seed.backgroundRisks.slice(0, 2).map((risk, index) => ({
      id: `${issueId}-focus-seed-${index}`,
      title: risk.title,
      priority: risk.priority,
      owner: risk.owner,
      riskNote: risk.nextAction,
      status: risk.escalationStatus === 'escalated' ? '已升级' : '关注中',
      pathLabel: risk.pathLabel,
      actionLabel: risk.actionLabel,
    })),
  ]

  return {
    highRiskCount: riskList.filter((risk) => risk.priority === '高').length,
    overdueCount: riskList.filter((risk) => risk.escalationStatus === 'escalated').length,
    inProgressCount: riskList.filter((risk) => risk.escalationStatus !== 'resolved').length,
    focusItemCount: focusItems.length,
    autoCompletedCount: analysisResult.recommended_path === '自动完成' ? 1 : 0,
    pendingConfirmationCount: analysisResult.recommended_path === '建议确认' ? 1 : 0,
    focusItems,
    departmentBacklog,
    riskList,
    executionLogs,
    managerSummary: buildManagerSummary(
      seed.summaryLead,
      seed.focusPrompts,
      analysisResult,
      timelineData,
      primaryAction,
      executionLogs,
    ),
  }
}

function getCurrentStatus(analysisResult: AIAnalysisResult): TimelineStatusKey {
  if (analysisResult.recommended_path === '自动完成') {
    return 'resolved'
  }

  if (analysisResult.recommended_path === '建议确认') {
    return 'pending_response'
  }

  if (analysisResult.priority === '高') {
    return 'in_progress'
  }

  if (analysisResult.priority === '中') {
    return 'pending_response'
  }

  return 'assigned'
}

function getEscalationStatus(analysisResult: AIAnalysisResult): EscalationStatus {
  if (analysisResult.recommended_path === '自动完成') {
    return 'none'
  }

  if (analysisResult.recommended_path === '建议确认') {
    return 'watching'
  }

  if (analysisResult.priority === '高') {
    return 'escalated'
  }

  if (analysisResult.priority === '中') {
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
  if (analysisResult.recommended_path === '自动完成') {
    return 'AI 已完成低风险标准动作，并已同步结果；如有例外可人工复核'
  }

  if (analysisResult.recommended_path === '建议确认') {
    return `由 ${analysisResult.recommended_owner} 确认建议动作后执行，并把确认结果写入执行日志`
  }

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
  primaryAction: AutomationActionKind,
  executionLogs: ExecutionLogEntry[],
) {
  const escalationText =
    timelineData.escalationStatus === 'escalated'
      ? '当前这条问题已经进入升级状态'
      : timelineData.escalationStatus === 'watching'
        ? '当前这条问题已经进入超时监控窗口'
        : '当前这条问题仍处于责任团队接单阶段'

  const pathText =
    analysisResult.recommended_path === '自动完成'
      ? `低风险标准动作已优先由 AI 执行，当前动作类型为 ${primaryAction}`
      : analysisResult.recommended_path === '建议确认'
        ? '系统已生成建议动作，等待负责人确认'
        : '系统已将问题导向升级人工处理'

  return `${lead}${escalationText}，由 ${analysisResult.recommended_owner} 承接，建议在 ${analysisResult.suggested_sla} 内完成关键反馈。当前路径为“${analysisResult.recommended_path}”，${pathText}。已写入 ${executionLogs.length} 条可审计执行日志。管理者此刻最该关注的是：${focusPrompts.join('；')}。`
}

function buildExecutionLogs({
  issueId,
  issueText,
  industryId,
  analysisResult,
  timelineData,
}: BuildDashboardDataInput): ExecutionLogEntry[] {
  const scenario = timelineScenarioMap[industryId]
  const now = new Date()

  if (analysisResult.recommended_path === '自动完成') {
    const automationAction = inferAutomationAction(issueText)

    return [
      {
        id: `${issueId}-log-1`,
        timestamp: formatLogTime(addMinutes(now, -9)),
        action: automationAction.action,
        reason: `属于低风险标准动作，可先由 AI 自动完成。${analysisResult.reason}`,
        result: automationAction.result,
        status: 'completed',
        requiresConfirmation: false,
        revocable: automationAction.revocable,
      },
      {
        id: `${issueId}-log-2`,
        timestamp: formatLogTime(addMinutes(now, -6)),
        action: '自动更新状态为“已完成”',
        reason: '标准动作已执行完成，需要把结果同步进管理视图。',
        result: `已同步给 ${analysisResult.recommended_owner} 与管理者看板。`,
        status: 'completed',
        requiresConfirmation: false,
        revocable: true,
      },
    ]
  }

  if (analysisResult.recommended_path === '建议确认') {
    return [
      {
        id: `${issueId}-log-1`,
        timestamp: formatLogTime(addMinutes(now, -10)),
        action: '生成建议处理方案',
        reason: `存在可执行规则，但仍需 ${analysisResult.recommended_owner} 或管理者确认。`,
        result: `已生成建议动作并推送给 ${analysisResult.recommended_owner}。`,
        status: 'completed',
        requiresConfirmation: true,
        revocable: false,
      },
      {
        id: `${issueId}-log-2`,
        timestamp: formatLogTime(addMinutes(now, -7)),
        action: '写入待确认任务',
        reason: '避免在边界不清晰的情况下由 AI 直接动作。',
        result: `当前事项等待 ${analysisResult.recommended_owner} 确认后执行。`,
        status: 'pending_confirmation',
        requiresConfirmation: true,
        revocable: true,
      },
      {
        id: `${issueId}-log-3`,
        timestamp: formatLogTime(addMinutes(now, -5)),
        action: '自动更新状态为“待确认”',
        reason: '当前处理路径为建议确认，需要把责任和状态同步给管理者。',
        result: '已进入看板并标记为待确认事项。',
        status: 'completed',
        requiresConfirmation: true,
        revocable: true,
      },
    ]
  }

  return [
    {
      id: `${issueId}-log-1`,
      timestamp: formatLogTime(addMinutes(now, -11)),
      action: `自动发送提醒给 ${analysisResult.recommended_owner}`,
      reason: `问题超出自动处理范围，且当前建议路径为“${analysisResult.recommended_path}”。`,
      result: `已提醒 ${analysisResult.recommended_owner} 尽快响应。`,
      status: 'completed',
      requiresConfirmation: false,
      revocable: false,
    },
    {
      id: `${issueId}-log-2`,
      timestamp: formatLogTime(addMinutes(now, -8)),
      action: `升级给 ${scenario.escalationActor}`,
      reason: `影响范围较大或优先级较高，已进入 ${labelForStatus(timelineData.currentStatus)} / ${labelForEscalation(timelineData.escalationStatus)} 阶段。`,
      result: `已升级给 ${scenario.escalationActor}，等待人工接手。`,
      status: 'escalated',
      requiresConfirmation: false,
      revocable: false,
    },
    {
      id: `${issueId}-log-3`,
      timestamp: formatLogTime(addMinutes(now, -4)),
      action: '自动更新状态为“待人工处理”',
      reason: '高风险或例外问题不应由 AI 直接完成，需要同步当前接管状态。',
      result: '已同步进入管理看板和后续跟进链路。',
      status: 'completed',
      requiresConfirmation: false,
      revocable: false,
    },
  ]
}

function inferAutomationAction(issueText: string) {
  if (matchesAny(issueText, ['查询', '剩余', '库存', '状态', '排班'])) {
    return {
      action: '自动信息查询' as AutomationActionKind,
      result: '已返回所需信息，并将结果同步到当前问题上下文。',
      revocable: false,
    }
  }

  if (matchesAny(issueText, ['通知', '提醒', '告知'])) {
    return {
      action: '自动通知' as AutomationActionKind,
      result: '已向目标对象发送标准通知，并回写执行结果。',
      revocable: true,
    }
  }

  if (matchesAny(issueText, ['怎么', '如何', '规则', '流程', 'FAQ'])) {
    return {
      action: '自动回答' as AutomationActionKind,
      result: '已返回标准答复，并提示如有例外可转人工处理。',
      revocable: false,
    }
  }

  return {
    action: '自动状态更新' as AutomationActionKind,
    result: '已按预设规则完成低风险处理动作，并记录执行结果。',
    revocable: true,
  }
}

export function derivePrimaryAction(
  issueText: string,
  recommendedPath: AIAnalysisResult['recommended_path'],
): AutomationActionKind {
  if (recommendedPath === '自动完成') {
    return inferAutomationAction(issueText).action
  }

  if (recommendedPath === '建议确认') {
    return '建议处理'
  }

  return '升级人工'
}

function deriveRiskEscalationStatus(
  analysisResult: AIAnalysisResult,
  timelineData: TimelineData,
): EscalationStatus {
  if (analysisResult.recommended_path === '自动完成') {
    return 'resolved'
  }

  return timelineData.escalationStatus
}

function formatLogTime(date: Date) {
  return date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function labelForEscalation(status: EscalationStatus) {
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

function matchesAny(text: string, keywords: string[]) {
  return keywords.some((keyword) => text.includes(keyword))
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
