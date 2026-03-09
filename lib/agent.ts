import 'server-only'

import Anthropic from '@anthropic-ai/sdk'
import { randomUUID } from 'node:crypto'
import {
  insertExecutionLog,
  insertNotification,
  insertTicket,
  listExecutionLogs,
  queryMockData,
  updateExecutionLogStatus,
  updateIssueStatus,
  updateIssueToEscalated,
  upsertIssue,
} from './db'
import type {
  AgentExecutionResult,
  AgentToolName,
  AIAnalysisResult,
  DbExecutionLogEntry,
  ExecutionLogStatus,
  QueryDataType,
} from './types'

const CLAUDE_MODEL = 'claude-sonnet-4-20250514'
const MAX_AGENT_TURNS = 6
type AgentProvider = 'anthropic' | 'openai' | 'minimax' | 'openai-compatible'

type ClaudeMessage = {
  role: 'user' | 'assistant'
  content: Array<Record<string, unknown>> | string
}

type ClaudeResponse = {
  id: string
  stop_reason: string | null
  content: Array<
    | { type: 'text'; text: string }
    | { type: 'tool_use'; id: string; name: AgentToolName; input: Record<string, unknown> }
  >
}

const TOOLS = [
  {
    name: 'send_notification',
    description: '发送通知给指定人员',
    input_schema: {
      type: 'object',
      properties: {
        recipient: { type: 'string' },
        message: { type: 'string' },
        urgency: { type: 'string', enum: ['高', '中', '低'] },
      },
      required: ['recipient', 'message', 'urgency'],
    },
  },
  {
    name: 'query_data',
    description: '查询企业内部数据，包括库存、排班、项目进度、申请状态',
    input_schema: {
      type: 'object',
      properties: {
        query_type: { type: 'string', enum: ['inventory', 'schedule', 'project', 'request'] },
        keyword: { type: 'string' },
      },
      required: ['query_type', 'keyword'],
    },
  },
  {
    name: 'create_ticket',
    description: '创建工单并分配责任人',
    input_schema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        owner: { type: 'string' },
        priority: { type: 'string' },
        sla: { type: 'string' },
        issue_id: { type: 'string' },
      },
      required: ['title', 'owner', 'priority', 'sla', 'issue_id'],
    },
  },
  {
    name: 'escalate_issue',
    description: '升级问题给管理层',
    input_schema: {
      type: 'object',
      properties: {
        issue_id: { type: 'string' },
        reason: { type: 'string' },
        escalate_to: { type: 'string' },
        current_status: { type: 'string' },
      },
      required: ['issue_id', 'reason', 'escalate_to', 'current_status'],
    },
  },
] as const

export async function runAgent(
  issueText: string,
  analysisResult: AIAnalysisResult,
  options?: { issueId?: string },
) {
  const issueId = options?.issueId?.trim() || randomUUID()
  const results: AgentExecutionResult[] = []

  upsertIssue(issueId, issueText, analysisResult)
  updateIssueStatus(issueId, 'Agent执行中')
  logSystem(issueId, 'Agent 开始处理', '已创建问题上下文并准备进入工具决策阶段。', 'started')

  results.push({
    id: randomUUID(),
    issueId,
    type: 'message',
    name: 'agent_initialized',
    status: 'running',
    timestamp: nowIso(),
    output: {
      issueId,
      recommended_path: analysisResult.recommended_path,
      auto_handle: analysisResult.auto_handle,
    },
  })

  try {
    const provider = resolveAgentProvider()

    if (provider !== 'anthropic') {
      const message = `当前 AGENT_PROVIDER=${provider}，但 runAgent 目前只实现了 anthropic Tool Use 路径。`
      logError(issueId, 'agent', 'Agent 配置缺失', message)
      updateIssueStatus(issueId, '执行失败')
      results.push(buildErrorResult(issueId, 'agent_error', message))
      return results
    }

    const apiKey = readAnthropicApiKey()

    const messages: ClaudeMessage[] = [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: buildInitialUserPrompt(issueId, issueText, analysisResult),
          },
        ],
      },
    ]

    for (let turn = 0; turn < MAX_AGENT_TURNS; turn += 1) {
      const response = await callClaude(messages, apiKey)
      const textBlocks = response.content.filter((block) => block.type === 'text') as Array<{
        type: 'text'
        text: string
      }>

      if (textBlocks.length > 0) {
        const summary = textBlocks.map((block) => block.text.trim()).filter(Boolean).join('\n')

        if (summary) {
          logSystem(issueId, 'Agent 生成总结', summary)
          results.push({
            id: randomUUID(),
            issueId,
            type: 'message',
            name: 'agent_summary',
            status: 'completed',
            timestamp: nowIso(),
            output: summary,
          })
        }
      }

      const toolUseBlocks = response.content.filter((block) => block.type === 'tool_use') as Array<{
        type: 'tool_use'
        id: string
        name: AgentToolName
        input: Record<string, unknown>
      }>

      if (toolUseBlocks.length === 0) {
        const completedToolCount = results.filter(
          (result) => result.type === 'tool' && result.status === 'completed',
        ).length
        logSystem(
          issueId,
          'Agent执行完成',
          `共完成${completedToolCount}个动作。`,
          'completed',
        )
        finalizeIssueStatus(issueId, results)
        return results
      }

      messages.push({ role: 'assistant', content: response.content as Array<Record<string, unknown>> })

      const toolResults = [] as Array<Record<string, unknown>>

      for (const toolUse of toolUseBlocks) {
        const execution = await executeTool(issueId, toolUse.name, toolUse.input)

        results.push({
          id: randomUUID(),
          issueId,
          type: 'tool',
          name: toolUse.name,
          status: execution.ok ? 'completed' : 'failed',
          timestamp: nowIso(),
          input: toolUse.input,
          output: execution.ok ? execution.output : undefined,
          error: execution.ok ? undefined : execution.error,
        })

        toolResults.push({
          type: 'tool_result',
          tool_use_id: toolUse.id,
          is_error: !execution.ok,
          content: JSON.stringify(execution.ok ? execution.output : { error: execution.error }, null, 2),
        })
      }

      messages.push({ role: 'user', content: toolResults })
    }

    const overflowMessage = 'Claude Agent 超过最大工具调用轮次，已停止继续执行。'
    logError(issueId, 'agent', 'Agent 调用轮次超限', overflowMessage)
    updateIssueStatus(issueId, '执行失败')
    results.push(buildErrorResult(issueId, 'agent_overflow', overflowMessage))
    return results
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Agent 执行失败。'
    logError(issueId, 'agent', 'Agent 执行异常', message)
    updateIssueStatus(issueId, '执行失败')
    results.push(buildErrorResult(issueId, 'agent_exception', message))
    return results
  }
}

export function getExecutionLogs(issueId: string) {
  return listExecutionLogs(issueId)
}

async function executeTool(issueId: string, name: AgentToolName, input: Record<string, unknown>) {
  const beforeLogId = logBeforeTool(issueId, name, input)

  try {
    switch (name) {
      case 'send_notification': {
        const output = runSendNotification(issueId, input)
        logAfterTool(issueId, beforeLogId, name, '通知已发送。', output, 'completed', false, true)
        return { ok: true as const, output }
      }
      case 'query_data': {
        const output = runQueryData(input)
        logAfterTool(issueId, beforeLogId, name, '企业内部数据查询完成。', output, 'completed', false, false)
        return { ok: true as const, output }
      }
      case 'create_ticket': {
        const output = runCreateTicket(issueId, input)
        logAfterTool(issueId, beforeLogId, name, '工单已创建并分配责任人。', output, 'completed', false, true)
        return { ok: true as const, output }
      }
      case 'escalate_issue': {
        const output = runEscalateIssue(issueId, input)
        logAfterTool(issueId, beforeLogId, name, '问题已升级给管理层。', output, 'completed', false, false)
        return { ok: true as const, output }
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : `${name} 工具执行失败。`
    updateExecutionLogStatus(beforeLogId, 'failed', message, message)
    logError(issueId, name, `工具 ${name} 执行失败`, message)
    return { ok: false as const, error: message }
  }
}

function runSendNotification(issueId: string, input: Record<string, unknown>) {
  const recipient = readString(input, 'recipient')
  const message = readString(input, 'message')
  const urgency = readUrgency(input.urgency)
  const record = insertNotification({
    recipient,
    message,
    urgency,
    issueId,
  })

  return {
    notification_id: record.id,
    sent_at: record.sentAt,
    recipient: record.recipient,
  }
}

function runQueryData(input: Record<string, unknown>) {
  const queryType = readQueryType(input.query_type)
  const keyword = readString(input, 'keyword')
  const matches = queryMockData(queryType, keyword)

  return {
    query_type: queryType,
    keyword,
    count: matches.length,
    items: matches.map((item) => ({
      id: item.id,
      keyword: item.keyword,
      result: item.result,
    })),
  }
}

function runCreateTicket(issueId: string, input: Record<string, unknown>) {
  const ticket = insertTicket({
    title: readString(input, 'title'),
    owner: readString(input, 'owner'),
    priority: readString(input, 'priority'),
    sla: readString(input, 'sla'),
    issueId: normalizeIssueId(issueId, input.issue_id),
  })

  return {
    ticket_id: ticket.id,
    created_at: ticket.createdAt,
    status: ticket.status,
    owner: ticket.owner,
    title: ticket.title,
  }
}

function runEscalateIssue(issueId: string, input: Record<string, unknown>) {
  const result = updateIssueToEscalated({
    issueId: normalizeIssueId(issueId, input.issue_id),
    reason: readString(input, 'reason'),
    escalateTo: readString(input, 'escalate_to'),
    currentStatus: readString(input, 'current_status'),
  })

  return {
    escalation_record_id: result.escalationLogId,
    escalated_at: result.escalatedAt,
    current_status: result.currentStatus,
    escalate_to: readString(input, 'escalate_to'),
  }
}

async function callClaude(messages: ClaudeMessage[], apiKey: string): Promise<ClaudeResponse> {
  const client = new Anthropic({
    apiKey,
    baseURL: (process.env.ANTHROPIC_BASE_URL?.trim() || 'https://api.anthropic.com').replace(/\/$/, ''),
  })

  return (await client.messages.create({
    model: process.env.ANTHROPIC_MODEL?.trim() || CLAUDE_MODEL,
    max_tokens: 1024,
    temperature: 0,
    system: buildSystemPrompt(),
    tools: TOOLS,
    messages: messages as never,
  } as never)) as unknown as ClaudeResponse
}

function buildSystemPrompt() {
  return [
    '你是 manage 的 AI Ops Agent。',
    '你的职责不是聊天，而是根据 issue_text 和 analysisResult 判断是否需要调用工具，并按合适顺序执行。',
    '你必须优先遵守 analysisResult 中的 recommended_path 和 auto_handle。',
    '如果路径为“自动完成”，优先完成低风险标准动作，如信息查询、通知、状态推进。',
    '如果路径为“建议确认”，可以先查询信息、创建工单、准备建议，但不要假装已经完成高风险动作。',
    '如果路径为“升级人工”，优先考虑创建工单、发送通知、升级问题。',
    '如果需要 issue_id，请使用上下文里提供的 issue_id。',
    '不要编造工具结果；所有外部动作都必须通过工具完成。',
    '当工具执行结束后，请给出简洁中文总结。',
  ].join('\n')
}

function buildInitialUserPrompt(issueId: string, issueText: string, analysisResult: AIAnalysisResult) {
  return [
    `issue_id: ${issueId}`,
    `issue_text: ${issueText}`,
    `analysis_result: ${JSON.stringify(analysisResult, null, 2)}`,
    '请根据上述信息决定调用哪些工具、调用顺序以及是否需要升级。',
  ].join('\n\n')
}

function logBeforeTool(issueId: string, toolName: AgentToolName, input: Record<string, unknown>) {
  const logId = randomUUID()

  insertExecutionLog({
    id: logId,
    issueId,
    timestamp: nowIso(),
    phase: 'before',
    toolName,
    action: `准备执行工具 ${toolName}`,
    reason: 'Claude Agent 已选择该工具作为当前动作。',
    result: '工具已开始执行。',
    status: 'started',
    requiresConfirmation: false,
    revocable: false,
    details: JSON.stringify(input),
  })

  return logId
}

function logAfterTool(
  issueId: string,
  beforeLogId: string,
  toolName: AgentToolName,
  reason: string,
  output: unknown,
  status: ExecutionLogStatus,
  requiresConfirmation: boolean,
  revocable: boolean,
) {
  updateExecutionLogStatus(beforeLogId, 'completed')

  insertExecutionLog({
    id: randomUUID(),
    issueId,
    timestamp: nowIso(),
    phase: 'after',
    toolName,
    action: `完成工具 ${toolName}`,
    reason,
    result: JSON.stringify(output),
    status,
    requiresConfirmation,
    revocable,
    details: JSON.stringify(output),
  })
}

function logSystem(
  issueId: string,
  action: string,
  result: string,
  status: DbExecutionLogEntry['status'] = 'completed',
) {
  insertExecutionLog({
    id: randomUUID(),
    issueId,
    timestamp: nowIso(),
    phase: 'system',
    toolName: 'agent',
    action,
    reason: 'Agent 执行流转记录。',
    result,
    status,
    requiresConfirmation: false,
    revocable: false,
  })
}

function logError(issueId: string, toolName: AgentToolName | 'agent', action: string, errorMessage: string) {
  insertExecutionLog({
    id: randomUUID(),
    issueId,
    timestamp: nowIso(),
    phase: 'error',
    toolName,
    action,
    reason: '执行过程中发生错误。',
    result: errorMessage,
    status: 'failed',
    requiresConfirmation: false,
    revocable: false,
    details: errorMessage,
  })
}

function buildErrorResult(issueId: string, name: string, error: string): AgentExecutionResult {
  return {
    id: randomUUID(),
    issueId,
    type: 'message',
    name,
    status: 'failed',
    timestamp: nowIso(),
    error,
  }
}

function finalizeIssueStatus(issueId: string, results: AgentExecutionResult[]) {
  const hasFailure = results.some((result) => result.status === 'failed')
  updateIssueStatus(issueId, hasFailure ? '执行失败' : 'AI已完成')
}

function readString(input: Record<string, unknown>, key: string) {
  const value = input[key]

  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`工具参数 ${key} 缺失或不是合法字符串。`)
  }

  return value.trim()
}

function readUrgency(value: unknown): '高' | '中' | '低' {
  if (value === '高' || value === '中' || value === '低') {
    return value
  }

  throw new Error('工具参数 urgency 仅支持 高 / 中 / 低。')
}

function readQueryType(value: unknown): QueryDataType {
  if (value === 'inventory' || value === 'schedule' || value === 'project' || value === 'request') {
    return value
  }

  throw new Error('工具参数 query_type 仅支持 inventory / schedule / project / request。')
}

function normalizeIssueId(issueId: string, value: unknown) {
  if (typeof value === 'string' && value.trim()) {
    return value.trim()
  }

  return issueId
}

function sanitize(value: string) {
  return value.replace(/\s+/g, ' ').trim().slice(0, 300)
}

function resolveAgentProvider(): AgentProvider {
  const value = (process.env.AGENT_PROVIDER?.trim() || 'anthropic').toLowerCase()

  if (
    value === 'anthropic' ||
    value === 'openai' ||
    value === 'minimax' ||
    value === 'openai-compatible'
  ) {
    return value
  }

  throw new Error('AGENT_PROVIDER 仅支持 anthropic、openai、minimax 或 openai-compatible。')
}

function readAnthropicApiKey() {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim()

  if (!apiKey) {
    throw new Error('缺少 ANTHROPIC_API_KEY，无法运行 Claude Agent。')
  }

  return apiKey
}

function nowIso() {
  return new Date().toISOString()
}
