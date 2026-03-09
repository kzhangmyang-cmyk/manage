import type { CSSProperties } from 'react'
import { derivePrimaryAction } from '../../lib/demo-flow'
import type { AIAnalysisResult, AnalysisStatus } from '../../lib/types'

type HandleDecisionCardProps = {
  status: AnalysisStatus
  result: AIAnalysisResult | null
  issueText: string
}

const blockStyle: CSSProperties = {
  padding: '16px',
  borderRadius: '18px',
  border: '1px solid var(--color-border-soft)',
  background: 'rgba(255, 255, 255, 0.74)',
}

export function HandleDecisionCard({ status, result, issueText }: HandleDecisionCardProps) {
  if (!result) {
    return (
      <article className="placeholder-panel">
        <span className="panel-kicker">Decision</span>
        <h3 className="panel-title">AI 会怎么处理这件事</h3>
        <p className="panel-description">
          这里不是简单区分自动或人工，而是明确告诉管理者：这件事该先自动完成、先建议确认，还是必须升级人工。
        </p>
        <div style={blockStyle}>
          {status === 'loading'
            ? '系统正在根据真实模型返回结果判断：哪些事 AI 可以先做，哪些事必须等人确认，哪些事需要直接升级。'
            : '等待解析结果后展示 AI 的处理决策。'}
        </div>
      </article>
    )
  }

  const tone = getDecisionTone(result.recommended_path)
  const actionLabel = derivePrimaryAction(issueText, result.recommended_path)

  return (
    <article className="placeholder-panel">
      <span className="panel-kicker">Decision</span>
      <h3 className="panel-title">AI 会怎么处理这件事</h3>
      <p className="panel-description">
        这一步回答的不只是“谁来接”，还回答“AI 能不能先把低风险部分做掉”。这决定了后面是直接出结果、等待确认，还是马上升级。
      </p>

      <div className="panel-chips">
        <span className="panel-chip">推荐路径：{result.recommended_path}</span>
        <span className="panel-chip">自动处理：{result.auto_handle ? '可自动完成' : '不直接自动完成'}</span>
        <span className="panel-chip">当前动作：{actionLabel}</span>
      </div>

      <div style={{ display: 'grid', gap: '12px', marginTop: '18px' }}>
        <section style={{ ...blockStyle, ...tone }}>
          <div style={labelStyle}>AI 当前判断</div>
          <div style={valueStyle}>{getDecisionHeadline(result)}</div>
          <div style={descriptionStyle}>{getDecisionDescription(result)}</div>
        </section>

        <section style={blockStyle}>
          <div style={labelStyle}>AI 先做什么</div>
          <div style={valueStyle}>{actionLabel}</div>
          <div style={descriptionStyle}>{getActionPlanCopy(result, actionLabel)}</div>
        </section>

        <section style={blockStyle}>
          <div style={labelStyle}>管理者接下来要看什么</div>
          <div style={descriptionStyle}>{getNextActionCopy(result)}</div>
        </section>
      </div>
    </article>
  )
}

const labelStyle: CSSProperties = {
  fontSize: '0.78rem',
  fontWeight: 700,
  color: 'var(--color-text-muted)',
}

const valueStyle: CSSProperties = {
  marginTop: '8px',
  fontSize: '1.08rem',
  fontWeight: 700,
  color: 'var(--color-text)',
}

const descriptionStyle: CSSProperties = {
  marginTop: '8px',
  lineHeight: 1.65,
  color: 'var(--color-text-soft)',
}

function getDecisionTone(path: AIAnalysisResult['recommended_path']): CSSProperties {
  if (path === '自动完成') {
    return {
      border: '1px solid rgba(32, 106, 94, 0.22)',
      background: 'rgba(229, 241, 238, 0.82)',
    }
  }

  if (path === '建议确认') {
    return {
      border: '1px solid rgba(177, 132, 60, 0.24)',
      background: 'rgba(248, 240, 216, 0.82)',
    }
  }

  return {
    border: '1px solid rgba(178, 95, 69, 0.24)',
    background: 'rgba(252, 241, 236, 0.82)',
  }
}

function getDecisionHeadline(result: AIAnalysisResult) {
  if (result.recommended_path === '自动完成') {
    return '这件事适合先由 AI 自动完成低风险标准动作'
  }

  if (result.recommended_path === '建议确认') {
    return '这件事可以先形成建议动作，但仍需负责人确认'
  }

  return '这件事超出自动处理范围，应尽快升级人工处理'
}

function getDecisionDescription(result: AIAnalysisResult) {
  if (result.recommended_path === '自动完成') {
    return `系统判断这是一个低风险、规则清晰的问题，适合先由 AI 执行标准动作，再把结果同步给管理者。`
  }

  if (result.recommended_path === '建议确认') {
    return `系统已形成可执行建议，但为了避免误动作，仍应由 ${result.recommended_owner} 或管理者做最终确认。`
  }

  return `系统判断影响范围或不确定性较高，不建议由 AI 直接完成，应由 ${result.recommended_owner} 或上级负责人接手。`
}

function getNextActionCopy(result: AIAnalysisResult) {
  if (result.recommended_path === '自动完成') {
    return '你接下来看到的重点不是“有人接单了没有”，而是“AI 已经先完成了什么、结果是什么、是否需要人工复核”。'
  }

  if (result.recommended_path === '建议确认') {
    return '你接下来要盯的是确认是否及时发生，以及系统生成的建议动作有没有被推进，而不是继续在群里追问。'
  }

  return '你接下来要盯的是升级是否及时、谁已经接手，以及风险有没有继续扩大。'
}

function getActionPlanCopy(
  result: AIAnalysisResult,
  actionLabel: ReturnType<typeof derivePrimaryAction>,
) {
  if (result.recommended_path === '自动完成') {
    if (actionLabel === '自动信息查询') {
      return 'AI 会先去完成标准信息查询，再把查询结果同步给问题提交人和管理视图。'
    }

    if (actionLabel === '自动回答') {
      return 'AI 会先返回标准答复，减少这类低风险问题继续占用人工沟通成本。'
    }

    if (actionLabel === '自动通知') {
      return 'AI 会先触发标准通知动作，并把触达结果写入审计日志。'
    }

    return 'AI 会先完成标准状态更新，把问题直接推进到下一管理节点。'
  }

  if (result.recommended_path === '建议确认') {
    return 'AI 会先生成建议动作和说明，再等待负责人确认后继续执行。'
  }

  return 'AI 不会越权直接处理，会先完成提醒/升级准备，再把问题交给人工接手。'
}
