import type { CSSProperties } from 'react'
import type { AgentActivityItem, AnalysisStatus } from '../../lib/types'

type AgentActivityPanelProps = {
  status: AnalysisStatus
  activities: AgentActivityItem[]
}

const rowStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '16px minmax(0, 1fr)',
  gap: '12px',
  alignItems: 'start',
}

function getDotStyle(status: AgentActivityItem['status']): CSSProperties {
  if (status === 'completed') {
    return {
      background: 'var(--color-accent)',
      boxShadow: '0 0 0 5px rgba(32, 106, 94, 0.12)',
    }
  }

  if (status === 'active') {
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

export function AgentActivityPanel({ status, activities }: AgentActivityPanelProps) {
  return (
    <article className="placeholder-panel">
      <span className="panel-kicker">Agent activity</span>
      <h3 className="panel-title">Agent Activity</h3>
      <p className="panel-description">
        这一列未来必须绑定真实 AI 请求生命周期。当前先用本地预演结果验证信息结构，不使用纯定时器动画。
      </p>

      <div className="panel-chips">
        <span className="panel-chip">status: {status}</span>
        <span className="panel-chip">lifecycle-ready</span>
      </div>

      {activities.length > 0 ? (
        <div style={{ display: 'grid', gap: '16px', marginTop: '20px' }}>
          {activities.map((activity) => (
            <div key={activity.id} style={rowStyle}>
              <span
                aria-hidden="true"
                style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '999px',
                  marginTop: '6px',
                  ...getDotStyle(activity.status),
                }}
              />
              <div>
                <div style={{ fontWeight: 600, lineHeight: 1.5, color: 'var(--color-text)' }}>
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
          还没有请求生命周期。先从输入页提交一个问题，本地预演会生成一组可替换为真实请求状态的 Activity。
        </div>
      )}
    </article>
  )
}
