'use client'

import { useEffect, useMemo, useState } from 'react'
import type { DashboardData, RecentExecutionLogItem } from '../../lib/types'
import { ExecutionLogItem } from './ExecutionLogItem'

type ExecutionLogPanelProps = {
  data: DashboardData | null
}

export function ExecutionLogPanel({ data }: ExecutionLogPanelProps) {
  const [logs, setLogs] = useState<RecentExecutionLogItem[]>([])
  const [filter, setFilter] = useState<'all' | 'auto' | 'pending' | 'escalated'>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [confirmingId, setConfirmingId] = useState<string | null>(null)

  useEffect(() => {
    void fetchLogs()
  }, [])

  const filteredLogs = useMemo(() => {
    if (filter === 'all') {
      return logs
    }

    if (filter === 'auto') {
      return logs.filter((log) => log.recommendedPath === '自动完成')
    }

    if (filter === 'pending') {
      return logs.filter((log) => log.status === 'pending_confirmation' || log.requiresConfirmation)
    }

    return logs.filter(
      (log) => log.recommendedPath === '升级人工' || log.status === 'escalated',
    )
  }, [filter, logs])

  async function fetchLogs() {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/logs', {
        cache: 'no-store',
      })

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null
        throw new Error(payload?.error ?? '读取执行日志失败。')
      }

      const payload = (await response.json()) as { logs: RecentExecutionLogItem[] }
      setLogs(Array.isArray(payload.logs) ? payload.logs : [])
    } catch (err) {
      setError(err instanceof Error ? err.message : '读取执行日志失败。')
    } finally {
      setLoading(false)
    }
  }

  async function handleConfirm(logId: string) {
    try {
      setConfirmingId(logId)
      const response = await fetch(`/api/logs/${logId}/confirm`, {
        method: 'POST',
      })

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null
        throw new Error(payload?.error ?? '确认执行失败。')
      }

      await fetchLogs()
    } catch (err) {
      setError(err instanceof Error ? err.message : '确认执行失败。')
    } finally {
      setConfirmingId(null)
    }
  }

  return (
    <article className="placeholder-panel span-12">
      <span className="panel-kicker">Execution log</span>
      <h3 className="panel-title">AI 到底做了什么</h3>
      <p className="panel-description">
        这不是附属信息，而是管理者相信 AI 会先做事、并且做得可追踪的核心依据。这里会明确展示时间、动作、原因、结果、状态，以及是否需要确认和是否可撤回。
      </p>

      <div className="panel-chips" style={{ marginBottom: '16px' }}>
        <FilterChip label="全部" active={filter === 'all'} onClick={() => setFilter('all')} />
        <FilterChip label="自动完成" active={filter === 'auto'} onClick={() => setFilter('auto')} />
        <FilterChip label="待确认" active={filter === 'pending'} onClick={() => setFilter('pending')} />
        <FilterChip label="升级人工" active={filter === 'escalated'} onClick={() => setFilter('escalated')} />
      </div>

      {error ? (
        <div
          style={{
            padding: '16px',
            borderRadius: '18px',
            border: '1px solid rgba(178, 95, 69, 0.24)',
            background: 'rgba(252, 241, 236, 0.84)',
            color: '#7b3f2f',
          }}
        >
          {error}
        </div>
      ) : loading ? (
        <div
          style={{
            padding: '16px',
            borderRadius: '18px',
            border: '1px solid var(--color-border-soft)',
            background: 'rgba(255, 255, 255, 0.74)',
            color: 'var(--color-text-soft)',
          }}
        >
          正在读取真实执行日志...
        </div>
      ) : filteredLogs.length ? (
        <div style={{ display: 'grid', gap: '12px' }}>
          {filteredLogs.map((item) => (
            <ExecutionLogItem
              key={item.id}
              item={item}
              confirming={confirmingId === item.id}
              onConfirm={handleConfirm}
            />
          ))}
        </div>
      ) : (
        <div
          style={{
            padding: '16px',
            borderRadius: '18px',
            border: '1px solid var(--color-border-soft)',
            background: 'rgba(255, 255, 255, 0.74)',
            color: 'var(--color-text-soft)',
          }}
        >
          {data?.executionLogs.length
            ? '当前筛选条件下暂无日志。'
            : '完成一次 AI 解析后，这里会展示自动完成、建议确认或升级人工的真实执行轨迹。'}
        </div>
      )}
    </article>
  )
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '8px 10px',
        borderRadius: '999px',
        border: active ? '1px solid rgba(32, 106, 94, 0.3)' : '1px solid var(--color-border-soft)',
        background: active ? 'rgba(229, 241, 238, 0.82)' : 'rgba(255, 255, 255, 0.72)',
        color: active ? 'var(--color-accent-strong)' : 'var(--color-text-soft)',
        cursor: 'pointer',
      }}
    >
      {label}
    </button>
  )
}
