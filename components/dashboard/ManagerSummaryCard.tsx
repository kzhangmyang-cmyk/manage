import type { DashboardData } from '../../lib/types'

type ManagerSummaryCardProps = {
  data: DashboardData | null
}

export function ManagerSummaryCard({ data }: ManagerSummaryCardProps) {
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
        {data?.managerSummary ?? '完成一次 AI 解析后，这里会输出一段更像管理者视角的摘要，而不是功能说明。'}
      </div>

      {data ? (
        <div className="panel-chips" style={{ marginTop: '16px' }}>
          <span className="panel-chip">高风险 {data.highRiskCount}</span>
          <span className="panel-chip">升级 / 超时 {data.overdueCount}</span>
          <span className="panel-chip">待确认 {data.pendingConfirmationCount}</span>
          <span className="panel-chip">AI 已自动完成 {data.autoCompletedCount}</span>
          <span className="panel-chip">执行日志 {data.executionLogs.length}</span>
        </div>
      ) : null}
    </article>
  )
}
