import type { DashboardData } from '../../lib/types'

type ManagerSummaryCardProps = {
  data: DashboardData | null
}

export function ManagerSummaryCard({ data }: ManagerSummaryCardProps) {
  return (
    <article className="placeholder-panel span-7">
      <span className="panel-kicker">Manager summary</span>
      <h3 className="panel-title">简洁管理摘要</h3>
      <p className="panel-description">
        管理者不需要看所有细节，只需要知道：今天最重要的异常在哪里、谁该接、什么时候必须升级。
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
          <span className="panel-chip">超时 {data.overdueCount}</span>
          <span className="panel-chip">重点关注 {data.focusItemCount}</span>
        </div>
      ) : null}
    </article>
  )
}
