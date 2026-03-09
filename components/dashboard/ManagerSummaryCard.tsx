'use client'

import type { DashboardData } from '../../lib/types'
import { useDashboardSnapshot } from './useDashboardSnapshot'

type ManagerSummaryCardProps = {
  data: DashboardData | null
}

export function ManagerSummaryCard({ data }: ManagerSummaryCardProps) {
  const { data: snapshot, loading, error } = useDashboardSnapshot()

  return (
    <article className="placeholder-panel span-7">
      <span className="panel-kicker">Manager summary</span>
      <h3 className="panel-title">老板现在最该盯什么</h3>
      <p className="panel-description">
        管理者不需要看完所有细节，只需要迅速知道：哪些事 AI 已先完成、哪些还在等确认、哪些风险必须立即盯住。
      </p>

      <div
        style={{
          padding: '18px',
          borderRadius: '18px',
          border: '1px solid rgba(32, 106, 94, 0.22)',
          background: 'rgba(229, 241, 238, 0.82)',
          color: 'var(--color-accent-strong)',
          lineHeight: 1.75,
        }}
      >
        {snapshot?.agent_summary ??
          (loading
            ? '正在读取真实管理摘要...'
            : error ?? data?.managerSummary ?? '当前暂无管理摘要。')}
      </div>

      {snapshot ? (
        <div className="panel-chips" style={{ marginTop: '16px' }}>
          <span className="panel-chip">今日提交 {snapshot.today_total}</span>
          <span className="panel-chip">超时 {snapshot.overdue}</span>
          <span className="panel-chip">平均处理 {snapshot.avg_resolution_minutes} 分钟</span>
          <span className="panel-chip">需关注 {snapshot.risk_items.length}</span>
          {snapshot.top_categories.slice(0, 2).map((item) => (
            <span key={item.category} className="panel-chip">
              {item.category} {item.count}
            </span>
          ))}
        </div>
      ) : data ? (
        <div className="panel-chips" style={{ marginTop: '16px' }}>
          <span className="panel-chip">高风险 {data.highRiskCount}</span>
          <span className="panel-chip">升级 / 超时 {data.overdueCount}</span>
          <span className="panel-chip">待确认 {data.pendingConfirmationCount}</span>
          <span className="panel-chip">AI 已自动完成 {data.autoCompletedCount}</span>
        </div>
      ) : null}
    </article>
  )
}
