import type { DashboardData } from '../../lib/types'
import { ExecutionLogItem } from './ExecutionLogItem'

type ExecutionLogPanelProps = {
  data: DashboardData | null
}

export function ExecutionLogPanel({ data }: ExecutionLogPanelProps) {
  return (
    <article className="placeholder-panel span-12">
      <span className="panel-kicker">Execution log</span>
      <h3 className="panel-title">AI 到底做了什么</h3>
      <p className="panel-description">
        这不是附属信息，而是管理者相信 AI 会先做事、并且做得可追踪的核心依据。这里会明确展示时间、动作、原因、结果、状态，以及是否需要确认和是否可撤回。
      </p>

      {data?.executionLogs.length ? (
        <div style={{ display: 'grid', gap: '12px' }}>
          {data.executionLogs.map((item) => (
            <ExecutionLogItem key={item.id} item={item} />
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
          完成一次 AI 解析后，这里会展示自动完成、建议确认或升级人工的执行轨迹。
        </div>
      )}
    </article>
  )
}
