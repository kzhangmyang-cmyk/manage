import type { CSSProperties } from 'react'
import type { AIAnalysisResult, AnalysisStatus } from '../../lib/types'

type ParsingReasonCardProps = {
  status: AnalysisStatus
  result: AIAnalysisResult | null
  error: string | null
}

const itemStyle: CSSProperties = {
  padding: '16px',
  borderRadius: '18px',
  border: '1px solid var(--color-border-soft)',
  background: 'rgba(255, 255, 255, 0.72)',
}

export function ParsingReasonCard({ status, result, error }: ParsingReasonCardProps) {
  if (status === 'error' && error) {
    return (
      <article className="placeholder-panel">
        <span className="panel-kicker">Reasoning</span>
        <h3 className="panel-title">判断依据与处理建议</h3>
        <p className="panel-description">
          本次真实解析没有成功返回结构化字段，所以这里先展示错误状态，而不是伪造解释结果。
        </p>
        <div
          style={{
            ...itemStyle,
            background: 'rgba(235, 214, 207, 0.84)',
            border: '1px solid rgba(178, 95, 69, 0.26)',
            color: '#6d3424',
            lineHeight: 1.65,
          }}
        >
          {error}
        </div>
      </article>
    )
  }

  if (!result) {
    return (
      <article className="placeholder-panel">
        <span className="panel-kicker">Reasoning</span>
        <h3 className="panel-title">判断依据与处理建议</h3>
        <p className="panel-description">
          这里会解释为什么系统做出这样的分类、优先级和路由建议，帮助管理者快速建立信任。
        </p>
        <div style={itemStyle}>
          {status === 'loading'
            ? '正在等待真实 AI 返回判断依据与建议响应窗口。'
            : '等待解析结果后展示判断依据、推荐处理路径和建议响应窗口。'}
        </div>
      </article>
    )
  }

  return (
    <article className="placeholder-panel">
      <span className="panel-kicker">Reasoning</span>
      <h3 className="panel-title">判断依据与处理建议</h3>
      <p className="panel-description">
        这块不是展示“AI 很聪明”，而是让管理者清楚看到：为什么这件事值得被更快接住和推进。
      </p>

      <div style={{ display: 'grid', gap: '12px' }}>
        <section style={itemStyle}>
          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-text-muted)' }}>
            判断依据
          </div>
          <div style={{ marginTop: '8px', lineHeight: 1.65 }}>{result.reason}</div>
        </section>

        <section style={itemStyle}>
          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-text-muted)' }}>
            推荐流转对象
          </div>
          <div style={{ marginTop: '8px', lineHeight: 1.65 }}>
            建议优先路由到 {result.recommended_owner}，避免问题继续停留在群消息、私聊或口头同步里。
          </div>
        </section>

        <section style={itemStyle}>
          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-text-muted)' }}>
            处理路径说明
          </div>
          <div style={{ marginTop: '8px', lineHeight: 1.65 }}>{buildPathReasonCopy(result)}</div>
        </section>

        <section
          style={{
            ...itemStyle,
            background: 'rgba(229, 241, 238, 0.82)',
            border: '1px solid rgba(32, 106, 94, 0.22)',
          }}
        >
          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-text-muted)' }}>
            建议响应窗口
          </div>
          <div style={{ marginTop: '8px', lineHeight: 1.65 }}>
            当前建议 SLA 为 {result.suggested_sla}。后续接入真实 API 后，这里将直接展示模型返回字段，不再使用本地预演数据。
          </div>
        </section>
      </div>
    </article>
  )
}

function buildPathReasonCopy(result: AIAnalysisResult) {
  if (result.recommended_path === '自动完成') {
    return `系统判断该问题属于低风险标准动作，可先由 AI 自动完成。当前 auto_handle 为 ${result.auto_handle ? 'true' : 'false'}。`
  }

  if (result.recommended_path === '建议确认') {
    return `系统判断这件事已有明确建议，但仍需要负责人确认后再执行，避免 AI 在边界不清晰时直接动作。`
  }

  return `系统判断该问题影响较大或不确定性较高，因此推荐升级人工，而不是让 AI 直接处理。`
}
