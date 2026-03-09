import type { CSSProperties } from 'react'
import type { RecentExecutionLogItem } from '../../lib/types'

type ExecutionLogItemProps = {
  item: RecentExecutionLogItem
  confirming?: boolean
  onConfirm?: (id: string) => void
}

export function ExecutionLogItem({ item, confirming = false, onConfirm }: ExecutionLogItemProps) {
  const canConfirm = item.status === 'pending_confirmation' && item.requiresConfirmation && !!onConfirm

  return (
    <article
      style={{
        padding: '16px',
        borderRadius: '18px',
        border: '1px solid var(--color-border-soft)',
        background: 'rgba(255, 255, 255, 0.74)',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: '12px',
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ fontFamily: 'var(--font-mono), IBM Plex Mono, monospace', color: 'var(--color-text-muted)' }}>
          {formatTime(item.timestamp)}
        </div>
        <div className="panel-chips" style={{ gap: '6px' }}>
          <span className="panel-chip">状态：{labelForStatus(item.status)}</span>
          <span className="panel-chip">{item.requiresConfirmation ? '需确认' : '无需确认'}</span>
          <span className="panel-chip">{item.revocable ? '可撤回' : '不可撤回'}</span>
        </div>
      </div>

      <div style={{ display: 'grid', gap: '10px', marginTop: '14px' }}>
        <LogRow label="问题摘要" value={item.issueSummary} />
        <LogRow label="动作类型" value={item.action} />
        <LogRow label="执行结果" value={item.result} />
      </div>

      <div className="panel-chips" style={{ marginTop: '14px' }}>
        <span className="panel-chip">类别：{item.category}</span>
        <span className="panel-chip">优先级：{item.priority}</span>
        <span className="panel-chip">问题状态：{item.issueStatus}</span>
        {item.recommendedPath ? <span className="panel-chip">路径：{item.recommendedPath}</span> : null}
      </div>

      {canConfirm ? (
        <div style={{ marginTop: '14px' }}>
          <button
            type="button"
            className="action-button action-button--secondary"
            disabled={confirming}
            onClick={() => onConfirm(item.id)}
          >
            {confirming ? '确认中...' : '确认执行'}
          </button>
        </div>
      ) : null}
    </article>
  )
}

function LogRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={rowStyle}>
      <div style={labelStyle}>{label}</div>
      <div style={valueStyle}>{value}</div>
    </div>
  )
}

const rowStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '72px minmax(0, 1fr)',
  gap: '12px',
  alignItems: 'start',
}

const labelStyle: CSSProperties = {
  fontSize: '0.8rem',
  fontWeight: 700,
  color: 'var(--color-text-muted)',
}

const valueStyle: CSSProperties = {
  lineHeight: 1.65,
  color: 'var(--color-text)',
}

function labelForStatus(status: RecentExecutionLogItem['status']) {
  if (status === 'completed') {
    return '完成'
  }

  if (status === 'pending_confirmation') {
    return '待确认'
  }

  if (status === 'escalated') {
    return '已升级'
  }

  if (status === 'failed') {
    return '失败'
  }

  return '执行中'
}

function formatTime(value: string) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleString('zh-CN', {
    hour12: false,
  })
}
