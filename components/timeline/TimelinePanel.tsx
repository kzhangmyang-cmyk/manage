import { getTimelineOrder } from '../../lib/demo-flow'
import type { TimelineData } from '../../lib/types'
import { TimelineItem } from './TimelineItem'

type TimelinePanelProps = {
  data: TimelineData | null
}

export function TimelinePanel({ data }: TimelinePanelProps) {
  if (!data) {
    return (
      <article className="placeholder-panel is-primary">
        <span className="panel-kicker">Issue flow</span>
        <h3 className="panel-title">流转时间线</h3>
        <p className="panel-description">
          先完成一次 AI 解析后，这里会把问题从提交、分配、待响应到升级和处理中串成一条可读的时间线。
        </p>
        <div className="panel-chips">
          <span className="panel-chip">submitted</span>
          <span className="panel-chip">assigned</span>
          <span className="panel-chip">escalated</span>
        </div>
      </article>
    )
  }

  const order = getTimelineOrder()
  const currentIndex = order.indexOf(data.currentStatus)

  return (
    <article className="placeholder-panel is-primary">
      <span className="panel-kicker">Issue flow</span>
      <h3 className="panel-title">问题正在被推进，而不是停在群里</h3>
      <p className="panel-description">
        这条时间线不是为了展示流程有多复杂，而是为了让管理者一眼看清问题有没有被接住、有没有被分配、什么时候该升级。
      </p>

      <div className="panel-chips">
        <span className="panel-chip">当前状态：{labelForStatus(data.currentStatus)}</span>
        <span className="panel-chip">责任团队：{data.ownerTeam}</span>
        <span className="panel-chip">SLA 截止：{data.slaDeadline}</span>
        <span className="panel-chip">升级状态：{labelForEscalation(data.escalationStatus)}</span>
      </div>

      <div style={{ display: 'grid', gap: '16px', marginTop: '20px' }}>
        {data.timelineItems.map((item, index) => {
          const itemIndex = order.indexOf(item.statusKey)
          const state =
            itemIndex < currentIndex ? 'done' : itemIndex === currentIndex ? 'current' : 'upcoming'

          return (
            <TimelineItem
              key={item.id}
              item={item}
              state={state}
              isLast={index === data.timelineItems.length - 1}
            />
          )
        })}
      </div>
    </article>
  )
}

function labelForEscalation(status: TimelineData['escalationStatus']) {
  if (status === 'escalated') {
    return '已升级'
  }

  if (status === 'watching') {
    return '监控中'
  }

  if (status === 'resolved') {
    return '已关闭'
  }

  return '未触发'
}

function labelForStatus(status: TimelineData['currentStatus']) {
  switch (status) {
    case 'submitted':
      return '已提交'
    case 'assigned':
      return '已分配'
    case 'pending_response':
      return '待响应'
    case 'escalated':
      return '已升级'
    case 'in_progress':
      return '处理中'
    case 'resolved':
      return '已处理'
  }
}
