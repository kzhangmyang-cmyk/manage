import 'server-only'

import OpenAI from 'openai'
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

const MINIMAX_AGENT_MODEL = 'MiniMax-M2.5'
const MAX_AGENT_TURNS = 6
type AgentProvider = 'anthropic' | 'openai' | 'minimax' | 'openai-compatible'

type OpenAIStyleMessage = Record<string, unknown>

type OpenAIStyleToolCall = {
  id: string
  type: 'function'
  function: {
    name: AgentToolName
    arguments: string
  }
}

type OpenAIStyleResponse = {
  choices?: Array<{
    message?: {
      content?: string | null
      tool_calls?: OpenAIStyleToolCall[]
    }
  }>
}

const TOOL_DEFINITIONS = [
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

const OPENAI_TOOLS = TOOL_DEFINITIONS.map((tool) => ({
  type: 'function',
  function: {
    name: tool.name,
    description: tool.description,
    parameters: {
      type: 'object',
      properties: tool.input_schema.properties,
      required: tool.input_schema.required,
    },
  },
}))

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

    if (provider !== 'minimax') {
      const message = `当前 AGENT_PROVIDER=${provider}，但 runAgent 目前只实现了 minimax Tool Use 路径。`
      logError(issueId, 'agent', 'Agent 配置不匹配', message)
      updateIssueStatus(issueId, '执行失败')
      results.push(buildErrorResult(issueId, 'agent_error', message))
      return results
    }

    const apiKey = readMiniMaxApiKey()
    const messages: OpenAIStyleMessage[] = [
      {
        role: 'system',
        content: buildSystemPrompt(),
      },
      {
        role: 'user',
        content: buildInitialUserPrompt(issueId, issueText, analysisResult),
      },
    ]

    for (let turn = 0; turn < MAX_AGENT_TURNS; turn += 1) {
      const response = await callMiniMax(messages, apiKey)
      const message = response.choices?.[0]?.message

      const textContent = typeof message?.content === 'string' ? message.content.trim() : ''

      if (textContent) {
        logSystem(issueId, 'Agent 生成总结', textContent)
        results.push({
          id: randomUUID(),
          issueId,
          type: 'message',
          name: 'agent_summary',
          status: 'completed',
          timestamp: nowIso(),
          output: textContent,
        })
      }

      const toolCalls = Array.isArray(message?.tool_calls) ? message.tool_calls : []

      if (toolCalls.length === 0) {
        const completedToolCount = results.filter(
          (result) => result.type === 'tool' && result.status === 'completed',
        ).length
        logSystem(issueId, 'Agent执行完成', `共完成${completedToolCount}个动作。`, 'completed')
        finalizeIssueStatus(issueId, results)
        return results
      }

      messages.push({
        role: 'assistant',
        content: message?.content ?? '',
        tool_calls: toolCalls,
      })

      for (const toolCall of toolCalls) {
        const toolInput = parseToolArguments(toolCall.function.arguments)
        const execution = await executeTool(issueId, toolCall.function.name, toolInput, issueText)

        results.push({
          id: randomUUID(),
          issueId,
          type: 'tool',
          name: toolCall.function.name,
          status: execution.ok ? 'completed' : 'failed',
          timestamp: nowIso(),
          input: toolInput,
          output: execution.ok ? execution.output : undefined,
          error: execution.ok ? undefined : execution.error,
        })

        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: JSON.stringify(execution.ok ? execution.output : { error: execution.error }, null, 2),
        })
      }
    }

    const overflowMessage = 'MiniMax Agent 超过最大工具调用轮次，已停止继续执行。'
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

async function executeTool(
  issueId: string,
  name: AgentToolName,
  input: Record<string, unknown>,
  originalQuestion: string,
) {
  const beforeLogId = logBeforeTool(issueId, name, input)

  try {
    switch (name) {
      case 'send_notification': {
        const output = runSendNotification(issueId, input)
        logAfterTool(issueId, beforeLogId, name, '通知已发送。', output, 'completed', false, true)
        return { ok: true as const, output }
      }
      case 'query_data': {
        const output = await runQueryData(input, originalQuestion)
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

async function runQueryData(input: Record<string, unknown>, originalQuestion: string) {
  const queryType = readQueryType(input.query_type)
  const keyword = readString(input, 'keyword')
  const matches = queryMockData(queryType, keyword)

  if (matches.length > 0) {
    return { found: true, query_type: queryType, keyword, items: matches }
  }

  const apiKey = readMiniMaxApiKey()
  const client = new OpenAI({
    apiKey,
    baseURL: 'https://api.minimax.io/v1',
  })

  const fallback = await client.chat.completions.create({
    model: process.env.MINIMAX_AGENT_MODEL?.trim() || MINIMAX_AGENT_MODEL,
    messages: [
      {
        role: 'user',
        content: `员工询问：${originalQuestion}\n查询关键词：${keyword}\n\n内部数据库无记录，请根据企业管理常识给出简洁建议，不超过60字，不要编造具体数据。`,
      },
    ],
    extra_body: { reasoning_split: true },
  } as never)

  return {
    found: false,
    fallback: true,
    query_type: queryType,
    keyword,
    suggestion:
      typeof fallback.choices?.[0]?.message?.content === 'string' &&
      fallback.choices[0].message.content.trim()
        ? fallback.choices[0].message.content.trim()
        : '建议联系相关负责人确认。',
    note: '内部数据库无记录，以下为AI推理建议',
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

async function callMiniMax(messages: OpenAIStyleMessage[], apiKey: string): Promise<OpenAIStyleResponse> {
  const client = new OpenAI({
    apiKey,
    baseURL: 'https://api.minimax.chat/v1',
  })

  return (await client.chat.completions.create({
    model: process.env.MINIMAX_AGENT_MODEL?.trim() || MINIMAX_AGENT_MODEL,
    temperature: 0,
    max_tokens: 1024,
    tool_choice: 'auto',
    tools: OPENAI_TOOLS,
    messages: messages as never,
    extra_body: {
      reasoning_split: true,
    },
  } as never)) as unknown as OpenAIStyleResponse
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
    reason: 'MiniMax Agent 已选择该工具作为当前动作。',
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

function parseToolArguments(value: string) {
  try {
    const parsed = JSON.parse(value)
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {}
  } catch {
    throw new Error('工具参数不是合法 JSON。')
  }
}

function resolveAgentProvider(): AgentProvider {
  const value = (process.env.AGENT_PROVIDER?.trim() || 'minimax').toLowerCase()

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

function readMiniMaxApiKey() {
  const apiKey = process.env.MINIMAX_API_KEY?.trim()

  if (!apiKey) {
    throw new Error('缺少 MINIMAX_API_KEY，无法运行 MiniMax Agent。')
  }

  return apiKey
}

function nowIso() {
  return new Date().toISOString()
}
