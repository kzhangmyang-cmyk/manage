'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import type { AIAnalysisResult, AnalysisStatus, DbExecutionLogEntry } from '../../lib/types'

type AgentActivityPanelProps = {
  status: AnalysisStatus
  issueId: string | null
  recommendedPath?: AIAnalysisResult['recommended_path'] | null
}

const rowStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '16px minmax(0, 1fr)',
  gap: '12px',
  alignItems: 'start',
}

function getDotStyle(status: 'completed' | 'running' | 'failed', tone?: 'warning' | 'flow'): CSSProperties {
  if (status === 'completed') {
    return {
      background: tone === 'warning' ? 'var(--color-alert)' : 'var(--color-accent)',
      boxShadow:
        tone === 'warning'
          ? '0 0 0 5px rgba(178, 95, 69, 0.12)'
          : '0 0 0 5px rgba(32, 106, 94, 0.12)',
    }
  }

  if (status === 'running') {
    return {
      background: 'var(--color-alert)',
      boxShadow: '0 0 0 5px rgba(178, 95, 69, 0.12)',
    }
  }

  if (status === 'failed') {
    return {
      background: '#8b4632',
      boxShadow: '0 0 0 5px rgba(139, 70, 50, 0.12)',
    }
  }

  return {
    background: 'rgba(24, 29, 30, 0.18)',
    boxShadow: 'none',
  }
}

export function AgentActivityPanel({ status, issueId, recommendedPath }: AgentActivityPanelProps) {
  const [logs, setLogs] = useState<DbExecutionLogEntry[]>([])
  const [pollError, setPollError] = useState<string | null>(null)
  const closedByDoneRef = useRef(false)

  useEffect(() => {
    setLogs([])
    setPollError(null)
    closedByDoneRef.current = false

    if (!issueId) {
      return
    }

    const es = new EventSource(`/api/issues/${issueId}/stream`)

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as unknown

        if (isStreamControlMessage(data, 'done')) {
          closedByDoneRef.current = true
          es.close()
          return
        }

        if (isStreamControlMessage(data, 'ready')) {
          return
        }

        if (isExecutionLog(data)) {
          setLogs((previous) =>
            previous.some((item) => item.id === data.id) ? previous : [...previous, data],
          )
        }
      } catch (error) {
        setPollError(error instanceof Error ? error.message : '解析执行日志事件失败。')
      }
    }

    es.onerror = () => {
      if (!closedByDoneRef.current) {
        setPollError('Agent 实时日志连接中断。')
      }

      es.close()
    }

    return () => {
      es.close()
    }
  }, [issueId])

  const displayItems = useMemo(() => buildDisplayItems(logs, recommendedPath), [logs, recommendedPath])

  return (
    <article className="placeholder-panel">
      <span className="panel-kicker">Agent activity</span>
      <h3 className="panel-title">Agent Activity</h3>
      <p className="panel-description">
        这里展示的是 Agent 的真实执行过程。提交问题后，系统会轮询后台执行日志，而不是播放假动画。
      </p>

      <div className="panel-chips">
        <span className="panel-chip">status: {status}</span>
        <span className="panel-chip">issue: {issueId ?? 'pending'}</span>
        <span className="panel-chip">live logs</span>
      </div>

      {pollError ? (
        <div
          style={{
            marginTop: '20px',
            padding: '16px',
            borderRadius: '18px',
            border: '1px solid rgba(178, 95, 69, 0.24)',
            background: 'rgba(252, 241, 236, 0.84)',
            color: '#7b3f2f',
            lineHeight: 1.65,
          }}
        >
          {pollError}
        </div>
      ) : displayItems.length > 0 ? (
        <div style={{ display: 'grid', gap: '16px', marginTop: '20px' }}>
          {displayItems.map((activity) => (
            <div key={activity.id} style={rowStyle}>
              <span
                aria-hidden="true"
                style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '999px',
                  marginTop: '6px',
                  ...getDotStyle(activity.status, activity.tone),
                }}
              />
              <div>
                <div style={{ fontWeight: 600, lineHeight: 1.5, color: 'var(--color-text)', whiteSpace: 'pre-wrap' }}>
                  {activity.label}
                </div>
                {activity.detail ? (
                  <div style={{ marginTop: '6px', fontSize: '0.92rem', lineHeight: 1.55, color: 'var(--color-text-soft)' }}>
                    {activity.detail}
                  </div>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div
          style={{
            marginTop: '20px',
            padding: '16px',
            borderRadius: '18px',
            border: '1px solid var(--color-border-soft)',
            background: 'rgba(255, 255, 255, 0.76)',
            color: 'var(--color-text-soft)',
            lineHeight: 1.65,
          }}
        >
          {status === 'loading'
            ? '正在等待 AI 解析结果写入执行日志。'
            : '提交一个问题后，这里会自动轮询后台 Agent 的真实执行记录。'}
        </div>
      )}
    </article>
  )
}

type DisplayItem = {
  id: string
  label: string
  detail?: string
  status: 'completed' | 'running' | 'failed'
  tone?: 'warning' | 'flow'
}

function buildDisplayItems(
  logs: DbExecutionLogEntry[],
  recommendedPath?: AIAnalysisResult['recommended_path'] | null,
): DisplayItem[] {
  const items: DisplayItem[] = []

  logs.forEach((log) => {
    const formattedTime = formatTime(log.timestamp)
    const detailText = summarizeLogDetail(log)

    if (log.action === '加入后台 Agent 执行队列' || log.action === 'Agent 开始处理') {
      return
    }

    if (log.action === '接收问题并完成AI解析') {
      items.push({
        id: log.id,
        label: `${formattedTime}  ✓  接收问题并完成AI解析`,
        detail: detailText,
        status: 'completed',
      })
      return
    }

    if (log.phase === 'before' && log.toolName && log.toolName !== 'agent') {
      items.push({
        id: log.id,
        label: `${formattedTime}  →  调用工具：${log.toolName}（执行中...）`,
        detail: detailText,
        status: 'running',
        tone: 'flow',
      })
      return
    }

    if (log.phase === 'after' && log.toolName && log.toolName !== 'agent') {
      items.push({
        id: log.id,
        label: `${formattedTime}  ✓  ${summarizeCompletedTool(log)}`,
        detail: detailText,
        status: 'completed',
      })
      return
    }

    if (log.action === '该问题超出自动处理范围') {
      items.push({
        id: log.id,
        label: `${formattedTime}  ⚠  该问题超出自动处理范围`,
        detail: detailText,
        status: 'completed',
        tone: 'warning',
      })
      return
    }

    if (log.action === '已升级给管理层，等待人工介入') {
      items.push({
        id: log.id,
        label: `${formattedTime}  →  已升级给管理层，等待人工介入`,
        detail: detailText,
        status: 'completed',
        tone: 'flow',
      })
      return
    }

    if (log.action === '已生成处理建议，等待负责人确认') {
      items.push({
        id: log.id,
        label: `${formattedTime}  →  已生成处理建议，等待负责人确认`,
        detail: detailText,
        status: 'completed',
        tone: 'flow',
      })
      return
    }

    if (log.action === 'Agent执行完成') {
      items.push({
        id: log.id,
        label: `${formattedTime}  ✓  ${log.action}，${log.result}`,
        status: 'completed',
      })
      return
    }

    if (log.status === 'failed') {
      items.push({
        id: log.id,
        label: `${formattedTime}  ✕  ${log.action}`,
        detail: detailText,
        status: 'failed',
      })
      return
    }

    if (log.toolName === 'agent' && recommendedPath === '升级人工' && log.phase === 'system') {
      return
    }

    items.push({
      id: log.id,
      label: `${formattedTime}  ✓  ${log.action}`,
      detail: detailText,
      status: 'completed',
    })
  })

  return items
}

function summarizeCompletedTool(log: DbExecutionLogEntry) {
  const details = parseDetails(log.details)

  if (log.toolName === 'create_ticket') {
    const ticketId = readDetail(details, 'ticket_id')
    const owner = readDetail(details, 'owner')

    if (ticketId && owner) {
      return `已创建工单 ${ticketId}，分配给${owner}`
    }
  }

  if (log.toolName === 'send_notification') {
    const recipient = readDetail(details, 'recipient')
    const message = readDetail(details, 'message')

    if (recipient) {
      return message ? `已通知${recipient}，${message}` : `已通知${recipient}`
    }
  }

  if (log.toolName === 'query_data') {
    const queryType = readDetail(details, 'query_type')
    const count = readDetail(details, 'count')

    if (queryType) {
      return `已完成${queryType}查询${count ? `，返回${count}条结果` : ''}`
    }
  }

  if (log.toolName === 'escalate_issue') {
    const escalateTo = readDetail(details, 'escalate_to')

    if (escalateTo) {
      return `已升级给${escalateTo}，等待人工介入`
    }
  }

  return log.reason
}

function summarizeLogDetail(log: DbExecutionLogEntry) {
  if (log.phase === 'error' || log.status === 'failed') {
    return log.result
  }

  const details = parseDetails(log.details)

  if (log.toolName === 'query_data') {
    const items = Array.isArray(details.items) ? details.items : []

    if (items.length > 0) {
      return `已返回 ${items.length} 条查询结果。`
    }
  }

  if (typeof log.result === 'string' && log.result.trim()) {
    return log.result
  }

  return undefined
}

function isExecutionLog(value: unknown): value is DbExecutionLogEntry {
  if (!value || typeof value !== 'object') {
    return false
  }

  const record = value as Record<string, unknown>

  return (
    typeof record.id === 'string' &&
    typeof record.issueId === 'string' &&
    typeof record.timestamp === 'string' &&
    typeof record.action === 'string' &&
    typeof record.result === 'string'
  )
}

function isStreamControlMessage(value: unknown, type: 'ready' | 'done') {
  return (
    !!value &&
    typeof value === 'object' &&
    typeof (value as { type?: unknown }).type === 'string' &&
    (value as { type: string }).type === type
  )
}

function parseDetails(value?: string) {
  if (!value) {
    return {} as Record<string, unknown>
  }

  try {
    return JSON.parse(value) as Record<string, unknown>
  } catch {
    return {} as Record<string, unknown>
  }
}

function readDetail(details: Record<string, unknown>, key: string) {
  const value = details[key]

  if (typeof value === 'string' || typeof value === 'number') {
    return String(value)
  }

  return ''
}

function formatTime(value: string) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
}
