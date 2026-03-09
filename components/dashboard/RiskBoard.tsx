'use client'

import type { DashboardData } from '../../lib/types'
import { useDashboardSnapshot } from './useDashboardSnapshot'

type RiskBoardProps = {
  data: DashboardData | null
}

export function RiskBoard({ data }: RiskBoardProps) {
  const { data: snapshot, error } = useDashboardSnapshot()

  const metrics = snapshot
    ? [
        {
          label: '今日提交问题',
          value: String(snapshot.today_total),
          note: '今天进入系统的总问题数',
        },
        {
          label: 'AI 已自动完成',
          value: String(snapshot.auto_completed),
          note: `预计节省 ${snapshot.auto_completed * 15} 分钟管理时间`,
        },
        {
          label: '待人工确认',
          value: String(snapshot.pending_confirm),
          note: '系统已给建议，但还需要负责人拍板',
        },
        {
          label: '已升级人工',
          value: String(snapshot.escalated),
          note: `超时未处理 ${snapshot.overdue} 件`,
        },
      ]
    : [
        { label: '今日提交问题', value: data ? String(data.focusItemCount) : '--', note: '正在读取真实聚合数据' },
        { label: 'AI 已自动完成', value: data ? String(data.autoCompletedCount) : '--', note: '正在读取真实聚合数据' },
        { label: '待人工确认', value: data ? String(data.pendingConfirmationCount) : '--', note: '正在读取真实聚合数据' },
        { label: '已升级人工', value: data ? String(data.overdueCount) : '--', note: error ?? '正在读取真实聚合数据' },
      ]

  return (
    <>
      {metrics.map((metric) => (
        <article key={metric.label} className="placeholder-panel span-3">
          <span className="panel-kicker">Metric</span>
          <h3 className="panel-title">{metric.label}</h3>
          <div
            style={{
              marginTop: '18px',
              fontSize: '2.4rem',
              lineHeight: 1,
              letterSpacing: '-0.05em',
              fontWeight: 700,
              color: 'var(--color-text)',
            }}
          >
            {metric.value}
          </div>
          <p className="panel-description" style={{ marginBottom: 0 }}>
            {metric.note}
          </p>
        </article>
      ))}
    </>
  )
}
