export type IndustryId = 'manufacturing' | 'retail' | 'service'

export type DemoStep = 'input' | 'analysis' | 'timeline' | 'dashboard'

export type AnalysisStatus = 'idle' | 'loading' | 'success' | 'error'

export type RecommendedPath = '自动完成' | '建议确认' | '升级人工'

export type AutomationActionKind =
  | '自动回答'
  | '自动信息查询'
  | '自动通知'
  | '自动状态更新'
  | '建议处理'
  | '升级人工'

export type ActivityStatus = 'pending' | 'active' | 'completed' | 'failed'

export type ExecutionLogStatus =
  | 'completed'
  | 'pending_confirmation'
  | 'escalated'
  | 'queued'

export type IssueSource = 'employee' | 'store' | 'department'

export type TimelineStatusKey =
  | 'submitted'
  | 'assigned'
  | 'pending_response'
  | 'escalated'
  | 'in_progress'
  | 'resolved'

export type EscalationStatus = 'none' | 'watching' | 'escalated' | 'resolved'

export interface IndustryOption {
  value: IndustryId
  label: string
}

export interface StepTabItem {
  value: DemoStep
  label: string
  caption: string
}

export interface ExampleIssue {
  id: string
  title: string
  text: string
  pathHint?: RecommendedPath
  actionHint?: AutomationActionKind
}

export interface IndustryData {
  id: IndustryId
  label: string
  heroTitle: string
  heroSubtitle: string
  antiSurveillanceCopy: string
  withoutManageCopy: string
  resultCopy: string
  exampleIssues: ExampleIssue[]
  defaultDepartments: string[]
}

export interface AttachmentPlaceholderItem {
  id: string
  name: string
  typeLabel?: string
  sizeLabel?: string
}

export interface IssueDraft {
  text: string
  attachments: AttachmentPlaceholderItem[]
}

export interface ActiveIssue {
  id: string
  title: string
  description: string
  source: IssueSource
  reporterName: string
  reporterRole: string
  submittedAt: string
  industryId: IndustryId
  attachments: AttachmentPlaceholderItem[]
}

export interface AIAnalysisResult {
  category: string
  priority: string
  impact: string
  recommended_owner: string
  suggested_sla: string
  reason: string
  auto_handle: boolean
  recommended_path: RecommendedPath
}

export interface AgentActivityItem {
  id: string
  label: string
  status: ActivityStatus
  detail?: string
  startedAt?: string
  finishedAt?: string
}

export interface TimelineItem {
  id: string
  statusKey: TimelineStatusKey
  label: string
  timestamp: string
  actor: string
  detail: string
  highlight?: boolean
}

export interface TimelineData {
  issueId: string
  currentStatus: TimelineStatusKey
  escalationStatus: EscalationStatus
  ownerTeam: string
  slaDeadline: string
  timelineItems: TimelineItem[]
}

export interface FocusItem {
  id: string
  title: string
  priority: string
  owner: string
  riskNote: string
  status: string
  pathLabel?: RecommendedPath
  actionLabel?: AutomationActionKind
}

export interface DepartmentBacklogItem {
  department: string
  openCount: number
  overdueCount: number
  riskLevel: 'high' | 'medium' | 'low'
}

export interface RiskItem {
  id: string
  title: string
  category: string
  priority: string
  owner: string
  ageLabel: string
  escalationStatus: EscalationStatus
  nextAction: string
  pathLabel?: RecommendedPath
  actionLabel?: AutomationActionKind
}

export interface DashboardData {
  highRiskCount: number
  overdueCount: number
  inProgressCount: number
  focusItemCount: number
  autoCompletedCount: number
  pendingConfirmationCount: number
  focusItems: FocusItem[]
  departmentBacklog: DepartmentBacklogItem[]
  riskList: RiskItem[]
  executionLogs: ExecutionLogEntry[]
  managerSummary: string
}

export interface ExecutionLogEntry {
  id: string
  timestamp: string
  action: string
  reason: string
  result: string
  status: ExecutionLogStatus
  requiresConfirmation: boolean
  revocable: boolean
}
