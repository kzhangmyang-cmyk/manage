import 'server-only'

import { existsSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { randomUUID } from 'node:crypto'
import type {
  AIAnalysisResult,
  DashboardApiPayload,
  DashboardCategoryStat,
  DashboardRiskItem,
  DbExecutionLogEntry,
  MockDataRecord,
  NotificationRecord,
  QueryDataType,
  RecentExecutionLogItem,
  RecommendedPath,
  TicketRecord,
} from './types'

type StatementResult = {
  changes?: number
  lastInsertRowid?: number | bigint
}

type StatementLike = {
  run: (...params: unknown[]) => StatementResult
  get: (...params: unknown[]) => Record<string, unknown> | undefined
  all: (...params: unknown[]) => Array<Record<string, unknown>>
}

type DatabaseLike = {
  exec: (sql: string) => void
  prepare: (sql: string) => StatementLike
}

const { DatabaseSync } = require('node:sqlite') as {
  DatabaseSync: new (path: string) => DatabaseLike
}

const DB_PATH =
  process.env.MANAGE_DB_PATH?.trim() || join(process.cwd(), 'data', 'manage.sqlite')

declare global {
  var __manageDatabase: DatabaseLike | undefined
}

export function getDb() {
  if (!globalThis.__manageDatabase) {
    ensureDirectory(DB_PATH)
    const db = new DatabaseSync(DB_PATH)
    initializeDb(db)
    seedMockData(db)
    globalThis.__manageDatabase = db
  }

  return globalThis.__manageDatabase
}

export function upsertIssue(issueId: string, issueText: string, analysisResult: AIAnalysisResult) {
  const db = getDb()
  const now = nowIso()

  db.prepare(
    `
      INSERT INTO issues (
        id,
        issue_text,
        category,
        priority,
        status,
        current_status,
        recommended_owner,
        recommended_path,
        suggested_sla,
        auto_handle,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        issue_text = excluded.issue_text,
        category = excluded.category,
        priority = excluded.priority,
        status = excluded.status,
        current_status = excluded.current_status,
        recommended_owner = excluded.recommended_owner,
        recommended_path = excluded.recommended_path,
        suggested_sla = excluded.suggested_sla,
        auto_handle = excluded.auto_handle,
        updated_at = excluded.updated_at
    `,
  ).run(
    issueId,
    issueText,
    analysisResult.category,
    analysisResult.priority,
    '待处理',
    '待处理',
    analysisResult.recommended_owner,
    analysisResult.recommended_path,
    analysisResult.suggested_sla,
    analysisResult.auto_handle ? 1 : 0,
    now,
    now,
  )
}

export function insertExecutionLog(entry: DbExecutionLogEntry) {
  const db = getDb()

  db.prepare(
    `
      INSERT INTO execution_logs (
        id,
        issue_id,
        timestamp,
        phase,
        tool_name,
        action,
        reason,
        result,
        status,
        requires_confirmation,
        revocable,
        details
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
  ).run(
    entry.id,
    entry.issueId,
    entry.timestamp,
    entry.phase,
    entry.toolName ?? null,
    entry.action,
    entry.reason,
    entry.result,
    entry.status,
    entry.requiresConfirmation ? 1 : 0,
    entry.revocable ? 1 : 0,
    entry.details ?? null,
  )

  return entry.id
}

export function updateExecutionLogStatus(
  logId: string,
  status: DbExecutionLogEntry['status'],
  result?: string,
  details?: string,
) {
  const db = getDb()

  db.prepare(
    `
      UPDATE execution_logs
      SET status = ?,
          result = COALESCE(?, result),
          details = COALESCE(?, details)
      WHERE id = ?
    `,
  ).run(status, result ?? null, details ?? null, logId)

  return logId
}

export function listRecentExecutionLogs(limit = 50): RecentExecutionLogItem[] {
  const db = getDb()
  const rows = db
    .prepare(
      `
        SELECT
          l.id,
          l.issue_id,
          l.timestamp,
          l.action,
          l.result,
          l.status,
          l.requires_confirmation,
          l.revocable,
          i.issue_text,
          i.category,
          i.priority,
          i.recommended_path,
          i.status AS issue_status
        FROM execution_logs l
        LEFT JOIN issues i ON i.id = l.issue_id
        ORDER BY l.timestamp DESC, l.id DESC
        LIMIT ?
      `,
    )
    .all(limit)

  return rows.map((row) => ({
    id: String(row.id),
    issueId: String(row.issue_id),
    timestamp: String(row.timestamp),
    issueSummary: summarizeIssueText(row.issue_text),
    category: typeof row.category === 'string' ? row.category : '未知',
    priority: typeof row.priority === 'string' ? row.priority : '未知',
    recommendedPath: normalizeRecommendedPath(row.recommended_path),
    issueStatus: typeof row.issue_status === 'string' ? row.issue_status : '未知',
    action: String(row.action),
    result: String(row.result),
    status: String(row.status) as RecentExecutionLogItem['status'],
    requiresConfirmation: Number(row.requires_confirmation) === 1,
    revocable: Number(row.revocable) === 1,
  }))
}

export function getDashboardSnapshot(): DashboardApiPayload {
  const db = getDb()
  const rows = db
    .prepare(
      `
        SELECT
          id,
          issue_text,
          category,
          priority,
          status,
          recommended_owner,
          recommended_path,
          suggested_sla,
          created_at,
          updated_at
        FROM issues
      `,
    )
    .all()

  const todayStart = startOfToday()
  const todayIssues = rows.filter((row) => {
    const createdAt = new Date(String(row.created_at))
    return !Number.isNaN(createdAt.getTime()) && createdAt >= todayStart
  })

  const todayTotal = todayIssues.length
  const autoCompleted = todayIssues.filter((row) => String(row.status) === 'AI已完成').length
  const pendingConfirm = todayIssues.filter((row) => String(row.status) === '待确认').length
  const escalated = todayIssues.filter(
    (row) => String(row.status) === '已升级' || String(row.recommended_path) === '升级人工',
  ).length
  const overdue = todayIssues.filter((row) => isIssueOverdue(row)).length
  const avgResolutionMinutes = calculateAverageResolutionMinutes(todayIssues)
  const topCategories = buildTopCategories(todayIssues)
  const riskItems = buildRiskItems(rows)
  const savedMinutes = autoCompleted * 15

  return {
    today_total: todayTotal,
    auto_completed: autoCompleted,
    pending_confirm: pendingConfirm,
    escalated,
    overdue,
    avg_resolution_minutes: avgResolutionMinutes,
    top_categories: topCategories,
    risk_items: riskItems,
    agent_summary: `今日AI自动完成${autoCompleted}件事，节省管理者约${savedMinutes}分钟`,
  }
}

export function confirmExecutionLog(logId: string) {
  const db = getDb()
  const row = db
    .prepare(
      `
        SELECT
          l.id,
          l.issue_id,
          l.action,
          l.result,
          l.status,
          l.revocable,
          i.recommended_path
        FROM execution_logs l
        LEFT JOIN issues i ON i.id = l.issue_id
        WHERE l.id = ?
      `,
    )
    .get(logId)

  if (!row) {
    throw new Error('未找到对应的执行日志。')
  }

  const issueId = String(row.issue_id)
  const currentResult = typeof row.result === 'string' ? row.result : ''
  const nextResult = currentResult.includes('已确认执行')
    ? currentResult
    : `${currentResult}${currentResult ? ' ' : ''}已确认执行。`

  db.prepare(
    `
      UPDATE execution_logs
      SET status = ?,
          requires_confirmation = 0,
          result = ?
      WHERE id = ?
    `,
  ).run('completed', nextResult, logId)

  updateIssueStatus(issueId, '已确认执行')

  insertExecutionLog({
    id: randomUUID(),
    issueId,
    timestamp: nowIso(),
    phase: 'system',
    toolName: 'agent',
    action: '负责人已确认执行',
    reason: '管理者或负责人已在执行日志面板中确认该建议动作。',
    result: `已确认继续执行。当前路径：${typeof row.recommended_path === 'string' ? row.recommended_path : '未知'}。`,
    status: 'completed',
    requiresConfirmation: false,
    revocable: Number(row.revocable) === 1,
  })

  return {
    logId,
    issueId,
    status: 'completed',
  }
}

export function updateIssueStatus(issueId: string, status: string) {
  const db = getDb()
  const updatedAt = nowIso()

  db.prepare(
    `
      UPDATE issues
      SET status = ?, current_status = ?, updated_at = ?
      WHERE id = ?
    `,
  ).run(status, status, updatedAt, issueId)

  return {
    issueId,
    status,
    updatedAt,
  }
}

export function listExecutionLogs(issueId: string): DbExecutionLogEntry[] {
  const db = getDb()
  const rows = db
    .prepare(
      `
        SELECT
          id,
          issue_id,
          timestamp,
          phase,
          tool_name,
          action,
          reason,
          result,
          status,
          requires_confirmation,
          revocable,
          details
        FROM execution_logs
        WHERE issue_id = ?
        ORDER BY timestamp ASC, id ASC
      `,
    )
    .all(issueId)

  return rows.map((row) => ({
    id: String(row.id),
    issueId: String(row.issue_id),
    timestamp: String(row.timestamp),
    phase: normalizePhase(row.phase),
    toolName: normalizeToolName(row.tool_name),
    action: String(row.action),
    reason: String(row.reason),
    result: String(row.result),
    status: String(row.status) as DbExecutionLogEntry['status'],
    requiresConfirmation: Number(row.requires_confirmation) === 1,
    revocable: Number(row.revocable) === 1,
    details: typeof row.details === 'string' ? row.details : undefined,
  }))
}

export function insertNotification(input: {
  recipient: string
  message: string
  urgency: '高' | '中' | '低'
  issueId: string
}): NotificationRecord {
  const db = getDb()
  const record: NotificationRecord = {
    id: randomUUID(),
    recipient: input.recipient,
    message: input.message,
    urgency: input.urgency,
    issueId: input.issueId,
    sentAt: nowIso(),
  }

  db.prepare(
    `
      INSERT INTO notifications (id, recipient, message, urgency, issue_id, sent_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `,
  ).run(
    record.id,
    record.recipient,
    record.message,
    record.urgency,
    record.issueId,
    record.sentAt,
  )

  return record
}

export function insertTicket(input: {
  title: string
  owner: string
  priority: string
  sla: string
  issueId: string
}): TicketRecord {
  const db = getDb()
  const record: TicketRecord = {
    id: `TK-${Date.now().toString().slice(-8)}-${Math.floor(Math.random() * 900 + 100)}`,
    title: input.title,
    owner: input.owner,
    priority: input.priority,
    sla: input.sla,
    issueId: input.issueId,
    status: '待处理',
    createdAt: nowIso(),
  }

  db.prepare(
    `
      INSERT INTO tickets (id, title, owner, priority, sla, issue_id, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
  ).run(
    record.id,
    record.title,
    record.owner,
    record.priority,
    record.sla,
    record.issueId,
    record.status,
    record.createdAt,
  )

  return record
}

export function queryMockData(dataType: QueryDataType, keyword: string): MockDataRecord[] {
  const db = getDb()
  const search = `%${keyword.trim()}%`
  const rows = db
    .prepare(
      `
        SELECT id, data_type, keyword, result_json
        FROM mock_data
        WHERE data_type = ?
          AND (
            keyword LIKE ?
            OR result_json LIKE ?
          )
      `,
    )
    .all(dataType, search, search)

  return rows.map((row) => ({
    id: String(row.id),
    dataType: String(row.data_type) as QueryDataType,
    keyword: String(row.keyword),
    result: parseJsonRecord(row.result_json),
  }))
}

export function updateIssueToEscalated(input: {
  issueId: string
  currentStatus: string
  escalateTo: string
  reason: string
}) {
  const db = getDb()
  const escalatedAt = nowIso()

  db.prepare(
    `
      UPDATE issues
      SET status = ?, current_status = ?, updated_at = ?
      WHERE id = ?
    `,
  ).run('已升级', '已升级', escalatedAt, input.issueId)

  const escalationLogId = insertExecutionLog({
    id: randomUUID(),
    issueId: input.issueId,
    timestamp: escalatedAt,
    phase: 'after',
    toolName: 'escalate_issue',
    action: `升级给 ${input.escalateTo}`,
    reason: input.reason,
    result: `问题已从 ${input.currentStatus} 更新为已升级，并推送给 ${input.escalateTo}`,
    status: 'escalated',
    requiresConfirmation: false,
    revocable: false,
  })

  return {
    escalationLogId,
    escalatedAt,
    currentStatus: '已升级',
  }
}

function initializeDb(db: DatabaseLike) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      recipient TEXT NOT NULL,
      message TEXT NOT NULL,
      urgency TEXT NOT NULL,
      issue_id TEXT NOT NULL,
      sent_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tickets (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      owner TEXT NOT NULL,
      priority TEXT NOT NULL,
      sla TEXT NOT NULL,
      issue_id TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS mock_data (
      id TEXT PRIMARY KEY,
      data_type TEXT NOT NULL,
      keyword TEXT NOT NULL,
      result_json TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS issues (
      id TEXT PRIMARY KEY,
      issue_text TEXT NOT NULL,
      category TEXT NOT NULL,
      priority TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT '待处理',
      current_status TEXT NOT NULL,
      recommended_owner TEXT NOT NULL,
      recommended_path TEXT NOT NULL,
      suggested_sla TEXT,
      auto_handle INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS execution_logs (
      id TEXT PRIMARY KEY,
      issue_id TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      phase TEXT NOT NULL,
      tool_name TEXT,
      action TEXT NOT NULL,
      reason TEXT NOT NULL,
      result TEXT NOT NULL,
      status TEXT NOT NULL,
      requires_confirmation INTEGER NOT NULL DEFAULT 0,
      revocable INTEGER NOT NULL DEFAULT 0,
      details TEXT
    );
  `)

  ensureIssuesStatusColumn(db)
}

function seedMockData(db: DatabaseLike) {
  const countRow = db.prepare(`SELECT COUNT(*) AS count FROM mock_data`).get()
  const count = Number(countRow?.count ?? 0)

  if (count > 0) {
    return
  }

  const rows: Array<{ dataType: QueryDataType; keyword: string; result: Record<string, unknown> }> = [
    {
      dataType: 'inventory',
      keyword: '收银设备',
      result: { item: '收银设备备件', stock: 3, unit: '台' },
    },
    {
      dataType: 'inventory',
      keyword: '服务器',
      result: { item: '服务器配件', stock: 1, unit: '台' },
    },
    {
      dataType: 'schedule',
      keyword: 'IT支持',
      result: {
        team: 'IT支持',
        schedule: [
          { name: '李明', shift: '周一至周三' },
          { name: '王芳', shift: '周四至周五' },
        ],
      },
    },
    {
      dataType: 'project',
      keyword: '项目A',
      result: { project: '项目A', current_node: '测试阶段', delay_risk: '中等' },
    },
    {
      dataType: 'request',
      keyword: '报销申请#2024001',
      result: { request_id: '2024001', type: '报销申请', status: '审批中' },
    },
    {
      dataType: 'request',
      keyword: '请假申请#2024002',
      result: { request_id: '2024002', type: '请假申请', status: '已通过' },
    },
  ]

  const insert = db.prepare(
    `
      INSERT INTO mock_data (id, data_type, keyword, result_json)
      VALUES (?, ?, ?, ?)
    `,
  )

  rows.forEach((row) => {
    insert.run(randomUUID(), row.dataType, row.keyword, JSON.stringify(row.result))
  })
}

function ensureDirectory(filePath: string) {
  const dir = dirname(filePath)

  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
}

function ensureIssuesStatusColumn(db: DatabaseLike) {
  const columns = db.prepare(`PRAGMA table_info(issues)`).all()
  const hasStatus = columns.some((column) => String(column.name) === 'status')
  const hasSuggestedSla = columns.some((column) => String(column.name) === 'suggested_sla')

  if (!hasStatus) {
    db.exec(`ALTER TABLE issues ADD COLUMN status TEXT NOT NULL DEFAULT '待处理';`)
    db.exec(`UPDATE issues SET status = current_status WHERE status IS NULL OR status = '';`)
  }

  if (!hasSuggestedSla) {
    db.exec(`ALTER TABLE issues ADD COLUMN suggested_sla TEXT;`)
  }
}

function parseJsonRecord(value: unknown) {
  if (typeof value !== 'string') {
    return {}
  }

  try {
    return JSON.parse(value) as Record<string, unknown>
  } catch {
    return {}
  }
}

function normalizePhase(value: unknown): DbExecutionLogEntry['phase'] {
  if (value === 'before' || value === 'after' || value === 'error' || value === 'system') {
    return value
  }

  return 'system'
}

function normalizeToolName(value: unknown): DbExecutionLogEntry['toolName'] {
  if (
    value === 'send_notification' ||
    value === 'query_data' ||
    value === 'create_ticket' ||
    value === 'escalate_issue' ||
    value === 'agent'
  ) {
    return value
  }

  return undefined
}

function normalizeRecommendedPath(value: unknown): RecommendedPath | null {
  if (value === '自动完成' || value === '建议确认' || value === '升级人工') {
    return value
  }

  return null
}

function summarizeIssueText(value: unknown) {
  if (typeof value !== 'string' || !value.trim()) {
    return '未关联问题摘要'
  }

  const text = value.trim()

  if (text.length <= 32) {
    return text
  }

  return `${text.slice(0, 32)}...`
}

function nowIso() {
  return new Date().toISOString()
}

function startOfToday() {
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  return date
}

function buildTopCategories(rows: Array<Record<string, unknown>>): DashboardCategoryStat[] {
  const counts = new Map<string, number>()

  rows.forEach((row) => {
    const category = typeof row.category === 'string' ? row.category : '其他'
    counts.set(category, (counts.get(category) ?? 0) + 1)
  })

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([category, count]) => ({ category, count }))
}

function buildRiskItems(rows: Array<Record<string, unknown>>): DashboardRiskItem[] {
  return rows
    .filter((row) => {
      const priority = typeof row.priority === 'string' ? row.priority : ''
      const status = typeof row.status === 'string' ? row.status : ''
      return priority === '高' && !['AI已完成', '已确认执行'].includes(status)
    })
    .sort((a, b) => {
      const aTime = new Date(String(a.created_at)).getTime()
      const bTime = new Date(String(b.created_at)).getTime()
      return bTime - aTime
    })
    .slice(0, 6)
    .map((row) => ({
      id: String(row.id),
      issueSummary: summarizeIssueText(row.issue_text),
      category: typeof row.category === 'string' ? row.category : '其他',
      priority: typeof row.priority === 'string' ? row.priority : '未知',
      owner: typeof row.recommended_owner === 'string' ? row.recommended_owner : '待分配',
      status: typeof row.status === 'string' ? row.status : '未知',
      recommendedPath: normalizeRecommendedPath(row.recommended_path),
      createdAt: typeof row.created_at === 'string' ? row.created_at : '',
    }))
}

function calculateAverageResolutionMinutes(rows: Array<Record<string, unknown>>) {
  const resolvedRows = rows.filter((row) => {
    const status = typeof row.status === 'string' ? row.status : ''
    return ['AI已完成', '已确认执行', '已升级'].includes(status)
  })

  if (resolvedRows.length === 0) {
    return 0
  }

  const totalMinutes = resolvedRows.reduce((sum, row) => {
    const createdAt = new Date(String(row.created_at)).getTime()
    const updatedAt = new Date(String(row.updated_at)).getTime()

    if (Number.isNaN(createdAt) || Number.isNaN(updatedAt) || updatedAt < createdAt) {
      return sum
    }

    return sum + (updatedAt - createdAt) / 60000
  }, 0)

  return Math.round(totalMinutes / resolvedRows.length)
}

function isIssueOverdue(row: Record<string, unknown>) {
  const status = typeof row.status === 'string' ? row.status : ''

  if (['AI已完成', '已确认执行', '已升级'].includes(status)) {
    return false
  }

  const createdAt = new Date(String(row.created_at)).getTime()
  if (Number.isNaN(createdAt)) {
    return false
  }

  const slaText = typeof row.suggested_sla === 'string' ? row.suggested_sla : ''
  const slaMinutes = parseSlaMinutes(slaText)

  return Date.now() - createdAt > slaMinutes * 60000
}

function parseSlaMinutes(value: string) {
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
