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

export async function analyzeIssue(text: string): Promise<AIAnalysisResult> {
  const apiKey = process.env.OPENAI_API_KEY

  if (!apiKey) {
    throw new Error('缺少 OPENAI_API_KEY，无法进行真实 AI 解析。请先在 .env.local 中配置。')
  }

  const baseUrl = (process.env.OPENAI_BASE_URL ?? 'https://api.openai.com/v1').replace(/\/$/, '')
  const model = process.env.OPENAI_MODEL ?? 'gpt-4.1-mini'

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0,
      response_format: {
        type: 'json_object',
      },
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
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`AI 解析请求失败：${response.status} ${sanitizeErrorText(errorText)}`)
  }

  const payload = (await response.json()) as {
    choices?: Array<{
      message?: {
        content?: string
      }
    }>
  }

  const content = payload.choices?.[0]?.message?.content

  if (typeof content !== 'string' || !content.trim()) {
    throw new Error('模型返回为空，无法解析结构化结果。')
  }

  const parsed = parseJsonContent(content)

  return normalizeAnalysisResult(parsed)
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
    category: readStringField(record, 'category'),
    priority: readStringField(record, 'priority'),
    impact: readStringField(record, 'impact'),
    recommended_owner: readStringField(record, 'recommended_owner'),
    suggested_sla: readStringField(record, 'suggested_sla'),
    reason: readStringField(record, 'reason'),
  }
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
