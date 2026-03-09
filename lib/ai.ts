import type { AIAnalysisResult } from './types'

const ANALYZE_PROMPT = `你是一个企业内部问题分析助手。
用户会提交一条自然语言的内部问题描述。
请分析并以JSON格式返回：
{
  "category": "问题类型（IT/设备/HR/采购/客诉/其他）",
  "priority": "优先级（高/中/低）",
  "impact": "影响范围描述（一句话）",
  "recommended_owner": "推荐负责部门",
  "suggested_sla": "建议响应时限（如：30分钟/2小时/24小时）",
  "reason": "判断依据（一句话）"
}
只返回JSON，不要其他内容。`

type AIProvider = 'openai' | 'minimax' | 'openai-compatible'

type ProviderConfig = {
  provider: AIProvider
  apiKey: string
  model: string
  baseUrl: string
  apiPath: string
  useJsonResponseFormat: boolean
}

export async function analyzeIssue(text: string): Promise<AIAnalysisResult> {
  const config = resolveProviderConfig()
  const payload = await requestCompletion(text, config)

  throwIfProviderReturnedError(payload)

  const content = extractMessageContent(payload)

  if (!content) {
    throw new Error('模型返回为空，无法解析结构化结果。')
  }

  const parsed = parseJsonContent(content)

  return normalizeAnalysisResult(parsed)
}

function resolveProviderConfig(): ProviderConfig {
  const provider = normalizeProvider(process.env.AI_PROVIDER ?? inferProvider())

  if (provider === 'minimax') {
    const apiKey = readRequiredEnv(['MINIMAX_API_KEY', 'AI_API_KEY'])

    return {
      provider,
      apiKey,
      model: readOptionalEnv(['MINIMAX_MODEL', 'AI_MODEL']) ?? 'MiniMax-M2.5',
      baseUrl: stripTrailingSlash(
        readOptionalEnv(['MINIMAX_BASE_URL', 'AI_BASE_URL']) ?? 'https://api.minimaxi.com',
      ),
      apiPath: readOptionalEnv(['MINIMAX_API_PATH', 'AI_API_PATH']) ?? '/v1/text/chatcompletion_v2',
      useJsonResponseFormat: false,
    }
  }

  if (provider === 'openai-compatible') {
    const apiKey = readRequiredEnv(['AI_API_KEY', 'OPENAI_API_KEY'])

    return {
      provider,
      apiKey,
      model: readOptionalEnv(['AI_MODEL', 'OPENAI_MODEL']) ?? 'gpt-4.1-mini',
      baseUrl: stripTrailingSlash(
        readOptionalEnv(['AI_BASE_URL', 'OPENAI_BASE_URL']) ?? 'https://api.openai.com/v1',
      ),
      apiPath: readOptionalEnv(['AI_API_PATH']) ?? '/chat/completions',
      useJsonResponseFormat: true,
    }
  }

  const apiKey = readRequiredEnv(['OPENAI_API_KEY', 'AI_API_KEY'])

  return {
    provider,
    apiKey,
    model: readOptionalEnv(['OPENAI_MODEL', 'AI_MODEL']) ?? 'gpt-4.1-mini',
    baseUrl: stripTrailingSlash(
      readOptionalEnv(['OPENAI_BASE_URL', 'AI_BASE_URL']) ?? 'https://api.openai.com/v1',
    ),
    apiPath: readOptionalEnv(['OPENAI_API_PATH', 'AI_API_PATH']) ?? '/chat/completions',
    useJsonResponseFormat: true,
  }
}

async function requestCompletion(text: string, config: ProviderConfig): Promise<unknown> {
  if (config.provider === 'minimax') {
    return requestMiniMax(text, config)
  }

  return requestOpenAIStyle(text, config)
}

async function requestOpenAIStyle(text: string, config: ProviderConfig): Promise<unknown> {
  const body = {
    model: config.model,
    temperature: 0,
    messages: [
      {
        role: 'system',
        content: ANALYZE_PROMPT,
      },
      {
        role: 'user',
        content: text,
      },
    ],
  }

  const withJsonFormat = config.useJsonResponseFormat
    ? {
        ...body,
        response_format: {
          type: 'json_object',
        },
      }
    : body

  const firstResponse = await fetch(buildUrl(config.baseUrl, config.apiPath), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify(withJsonFormat),
  })

  if (firstResponse.ok) {
    return firstResponse.json()
  }

  const firstErrorText = await firstResponse.text()

  if (shouldRetryWithoutJsonFormat(firstResponse.status, firstErrorText, config)) {
    const fallbackResponse = await fetch(buildUrl(config.baseUrl, config.apiPath), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify(body),
    })

    if (!fallbackResponse.ok) {
      const fallbackErrorText = await fallbackResponse.text()
      throw new Error(
        `AI 解析请求失败：${fallbackResponse.status} ${sanitizeErrorText(fallbackErrorText)}`,
      )
    }

    return fallbackResponse.json()
  }

  throw new Error(`AI 解析请求失败：${firstResponse.status} ${sanitizeErrorText(firstErrorText)}`)
}

async function requestMiniMax(text: string, config: ProviderConfig): Promise<unknown> {
  const response = await fetch(buildUrl(config.baseUrl, config.apiPath), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      temperature: 0.1,
      messages: [
        {
          role: 'system',
          name: 'manage_system',
          content: ANALYZE_PROMPT,
        },
        {
          role: 'user',
          name: 'issue_reporter',
          content: text,
        },
      ],
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`AI 解析请求失败：${response.status} ${sanitizeErrorText(errorText)}`)
  }

  return response.json()
}

function inferProvider(): AIProvider {
  if (process.env.MINIMAX_API_KEY) {
    return 'minimax'
  }

  if (process.env.AI_API_KEY || process.env.AI_BASE_URL) {
    return 'openai-compatible'
  }

  return 'openai'
}

function normalizeProvider(value: string): AIProvider {
  const normalized = value.trim().toLowerCase()

  if (normalized === 'openai' || normalized === 'minimax' || normalized === 'openai-compatible') {
    return normalized
  }

  throw new Error(
    'AI_PROVIDER 仅支持 openai、minimax 或 openai-compatible，请检查 .env.local 配置。',
  )
}

function readRequiredEnv(keys: string[]): string {
  const value = readOptionalEnv(keys)

  if (!value) {
    throw new Error(`缺少 ${keys.join(' / ')}，无法进行真实 AI 解析。请先在 .env.local 中配置。`)
  }

  return value
}

function readOptionalEnv(keys: string[]): string | null {
  for (const key of keys) {
    const value = process.env[key]

    if (typeof value === 'string' && value.trim()) {
      return value.trim()
    }
  }

  return null
}

function buildUrl(baseUrl: string, path: string) {
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`

  return `${baseUrl}${normalizedPath}`
}

function stripTrailingSlash(value: string) {
  return value.replace(/\/$/, '')
}

function shouldRetryWithoutJsonFormat(status: number, errorText: string, config: ProviderConfig) {
  if (!config.useJsonResponseFormat) {
    return false
  }

  if (![400, 404, 422].includes(status)) {
    return false
  }

  const normalizedError = errorText.toLowerCase()

  return (
    normalizedError.includes('response_format') ||
    normalizedError.includes('json_object') ||
    normalizedError.includes('unsupported') ||
    normalizedError.includes('not support')
  )
}

function throwIfProviderReturnedError(payload: unknown) {
  if (!payload || typeof payload !== 'object') {
    return
  }

  const record = payload as {
    base_resp?: {
      status_code?: unknown
      status_msg?: unknown
    }
  }

  const statusCode = record.base_resp?.status_code

  if (typeof statusCode === 'number' && statusCode !== 0) {
    const statusMessage =
      typeof record.base_resp?.status_msg === 'string' && record.base_resp.status_msg.trim()
        ? record.base_resp.status_msg.trim()
        : '请求被提供商返回错误状态。'

    throw new Error(`AI 解析请求失败：${statusMessage}`)
  }
}

function extractMessageContent(payload: unknown): string {
  if (!payload || typeof payload !== 'object') {
    return ''
  }

  const record = payload as Record<string, unknown>
  const choiceContent = readNestedContent(record.choices)

  if (choiceContent) {
    return choiceContent
  }

  if (typeof record.content === 'string' && record.content.trim()) {
    return record.content.trim()
  }

  if (typeof record.reply === 'string' && record.reply.trim()) {
    return record.reply.trim()
  }

  if (record.reply && typeof record.reply === 'object') {
    const nestedReply = record.reply as Record<string, unknown>

    if (typeof nestedReply.content === 'string' && nestedReply.content.trim()) {
      return nestedReply.content.trim()
    }
  }

  return ''
}

function readNestedContent(value: unknown): string {
  if (!Array.isArray(value) || value.length === 0) {
    return ''
  }

  const firstChoice = value[0]

  if (!firstChoice || typeof firstChoice !== 'object') {
    return ''
  }

  const choice = firstChoice as {
    message?: {
      content?: unknown
    }
    delta?: {
      content?: unknown
    }
  }

  return stringifyContent(choice.message?.content ?? choice.delta?.content)
}

function stringifyContent(value: unknown): string {
  if (typeof value === 'string') {
    return value.trim()
  }

  if (!Array.isArray(value)) {
    return ''
  }

  return value
    .map((item) => {
      if (typeof item === 'string') {
        return item
      }

      if (item && typeof item === 'object' && typeof (item as { text?: unknown }).text === 'string') {
        return (item as { text: string }).text
      }

      return ''
    })
    .join('')
    .trim()
}

function parseJsonContent(content: string): unknown {
  const cleaned = content.trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/, '')

  try {
    return JSON.parse(cleaned)
  } catch {
    throw new Error('模型返回不是合法 JSON，无法继续展示解析结果。')
  }
}

function normalizeAnalysisResult(value: unknown): AIAnalysisResult {
  if (!value || typeof value !== 'object') {
    throw new Error('模型返回结构不正确，缺少解析字段。')
  }

  const record = value as Record<string, unknown>

  return {
    category: normalizeCategory(readStringField(record, 'category')),
    priority: normalizePriority(readStringField(record, 'priority')),
    impact: readStringField(record, 'impact'),
    recommended_owner: readStringField(record, 'recommended_owner'),
    suggested_sla: readStringField(record, 'suggested_sla'),
    reason: readStringField(record, 'reason'),
  }
}

function normalizeCategory(value: string) {
  const normalized = value.replace(/\s+/g, '').toLowerCase()

  if (normalized.includes('设备')) {
    return '设备'
  }

  if (normalized.includes('采购') || normalized.includes('供应')) {
    return '采购'
  }

  if (normalized.includes('客诉') || normalized.includes('投诉')) {
    return '客诉'
  }

  if (normalized.includes('hr') || normalized.includes('人事')) {
    return 'HR'
  }

  if (normalized.includes('it')) {
    return 'IT'
  }

  if (normalized.includes('其他')) {
    return '其他'
  }

  return value
}

function normalizePriority(value: string) {
  const normalized = value.replace(/\s+/g, '')

  if (normalized.includes('高') || normalized.includes('紧急') || normalized.includes('严重')) {
    return '高'
  }

  if (normalized.includes('低')) {
    return '低'
  }

  return '中'
}

function readStringField(record: Record<string, unknown>, key: keyof AIAnalysisResult): string {
  const value = record[key]

  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`模型返回缺少字段 ${key}。`)
  }

  return value.trim()
}

function sanitizeErrorText(text: string): string {
  return text.replace(/\s+/g, ' ').trim().slice(0, 240)
}
