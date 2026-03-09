import type { CSSProperties } from 'react'
import type { ExecutionLogEntry } from '../../lib/types'

type ExecutionLogItemProps = {
  item: ExecutionLogEntry
}

export function ExecutionLogItem({ item }: ExecutionLogItemProps) {
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
          {item.timestamp}
        </div>
        <div className="panel-chips" style={{ gap: '6px' }}>
          <span className="panel-chip">状态：{labelForStatus(item.status)}</span>
          <span className="panel-chip">{item.requiresConfirmation ? '需确认' : '无需确认'}</span>
          <span className="panel-chip">{item.revocable ? '可撤回' : '不可撤回'}</span>
        </div>
      </div>

      <div style={{ display: 'grid', gap: '10px', marginTop: '14px' }}>
        <LogRow label="动作" value={item.action} />
        <LogRow label="原因" value={item.reason} />
        <LogRow label="结果" value={item.result} />
      </div>
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

function labelForStatus(status: ExecutionLogEntry['status']) {
  if (status === 'completed') {
    return '完成'
  }

  if (status === 'pending_confirmation') {
    return '待确认'
  }

  if (status === 'escalated') {
    return '已升级'
  }

  return '排队中'
}
