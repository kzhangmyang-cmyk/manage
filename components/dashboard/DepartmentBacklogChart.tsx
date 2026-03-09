import type { DashboardData, DepartmentBacklogItem } from '../../lib/types'

type DepartmentBacklogChartProps = {
  data: DashboardData | null
}

export function DepartmentBacklogChart({ data }: DepartmentBacklogChartProps) {
  return (
    <article className="placeholder-panel span-5">
      <span className="panel-kicker">Department backlog</span>
      <h3 className="panel-title">部门积压情况</h3>
      <p className="panel-description">
        第一版不依赖图表库，先用轻量条形卡片展示各部门当前积压和逾期拆分，突出“哪里最容易堵”。
      </p>

      {data ? (
        <div style={{ display: 'grid', gap: '14px' }}>
          {data.departmentBacklog.map((item) => (
            <BacklogRow key={item.department} item={item} max={getMaxOpenCount(data.departmentBacklog)} />
          ))}
        </div>
      ) : (
        <div style={emptyStyle}>完成一次 AI 解析后，这里会生成部门积压和逾期分布。</div>
      )}
    </article>
  )
}

function BacklogRow({ item, max }: { item: DepartmentBacklogItem; max: number }) {
  const totalPercent = Math.max(22, Math.round((item.openCount / max) * 100))
  const overduePercent = item.openCount > 0 ? Math.max(6, Math.round((item.overdueCount / item.openCount) * totalPercent)) : 0

  return (
    <div style={{ display: 'grid', gap: '8px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center' }}>
        <div>
          <div style={{ fontWeight: 700, color: 'var(--color-text)' }}>{item.department}</div>
          <div style={{ fontSize: '0.88rem', color: 'var(--color-text-soft)' }}>
            开放 {item.openCount} · 逾期 {item.overdueCount}
          </div>
        </div>
        <div style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>{labelForRiskLevel(item.riskLevel)}</div>
      </div>

      <div
        style={{
          position: 'relative',
          height: '10px',
          borderRadius: '999px',
          background: 'rgba(24, 29, 30, 0.08)',
          overflow: 'hidden',
        }}
      >
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            width: `${totalPercent}%`,
            borderRadius: '999px',
            background: 'linear-gradient(90deg, rgba(32, 106, 94, 0.8), rgba(32, 106, 94, 0.4))',
          }}
        />
        {overduePercent > 0 ? (
          <span
            aria-hidden="true"
            style={{
              position: 'absolute',
              inset: 0,
              width: `${overduePercent}%`,
              borderRadius: '999px',
              background: 'linear-gradient(90deg, rgba(178, 95, 69, 0.95), rgba(178, 95, 69, 0.72))',
            }}
          />
        ) : null}
      </div>
    </div>
  )
}

const emptyStyle = {
  padding: '16px',
  borderRadius: '18px',
  border: '1px solid var(--color-border-soft)',
  background: 'rgba(255, 255, 255, 0.74)',
  color: 'var(--color-text-soft)',
}

function getMaxOpenCount(items: DepartmentBacklogItem[]) {
  return items.reduce((max, item) => Math.max(max, item.openCount), 1)
}

function labelForRiskLevel(level: DepartmentBacklogItem['riskLevel']) {
  if (level === 'high') {
    return '高风险'
  }

  if (level === 'medium') {
    return '需关注'
  }

  return '稳定'
}
