import type { CSSProperties } from 'react'
import type { AIAnalysisResult, AnalysisStatus } from '../../lib/types'
import { AnalysisField } from './AnalysisField'

type AIAnalysisCardProps = {
  status: AnalysisStatus
  industryLabel: string
  issueText: string
  result: AIAnalysisResult | null
  error: string | null
}

const summaryBoxStyle: CSSProperties = {
  marginTop: '18px',
  padding: '18px',
  borderRadius: '18px',
  border: '1px solid var(--color-border-soft)',
  background: 'rgba(255, 255, 255, 0.82)',
}

const fieldGridStyle: CSSProperties = {
  display: 'grid',
  gap: '12px',
  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
  marginTop: '18px',
}

export function AIAnalysisCard({
  status,
  industryLabel,
  issueText,
  result,
  error,
}: AIAnalysisCardProps) {
  const hasResult = Boolean(result)

  return (
    <article className="placeholder-panel is-primary">
      <span className="panel-kicker">AI analysis</span>
      <h3 className="panel-title">结构化解析结果</h3>
      <p className="panel-description">
        这里直接承接真实 `/api/analyze` 返回的 JSON。当前结果也会继续驱动后面的流转时间线和管理者看板。
      </p>

      <div className="panel-chips">
        <span className="panel-chip">当前案例：{industryLabel}</span>
        <span className="panel-chip">JSON response</span>
        <span className="panel-chip">
          {status === 'success'
            ? 'analysis ready'
            : status === 'loading'
              ? 'request running'
              : status === 'error'
                ? 'analysis failed'
                : 'waiting for analyze'}
        </span>
      </div>

      <div style={summaryBoxStyle}>
        <div
          style={{
            fontSize: '0.78rem',
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'var(--color-text-muted)',
          }}
        >
          Submitted issue
        </div>
        <div style={{ marginTop: '10px', lineHeight: 1.7, color: 'var(--color-text)' }}>
          {issueText || '请先在问题输入页提交一条自然语言问题。'}
        </div>
      </div>

      {status === 'error' && error ? (
        <div
          style={{
            ...summaryBoxStyle,
            marginTop: '18px',
            background: 'rgba(235, 214, 207, 0.84)',
            border: '1px solid rgba(178, 95, 69, 0.26)',
            color: '#6d3424',
          }}
        >
          {error}
        </div>
      ) : null}

      {status === 'loading' && !hasResult ? (
        <div style={{ ...summaryBoxStyle, marginTop: '18px' }}>
          正在等待真实 AI 返回结构化 JSON。当前会先锁定问题文本，再把分类、优先级、影响范围、路由对象和 SLA 写入本页。
        </div>
      ) : null}

      {hasResult ? (
        <div style={fieldGridStyle}>
          <AnalysisField label="问题类型" value={result?.category ?? '-'} tone="accent" />
          <AnalysisField
            label="优先级"
            value={result?.priority ?? '-'}
            tone={result?.priority === '高' ? 'alert' : 'default'}
          />
          <AnalysisField label="影响范围" value={result?.impact ?? '-'} />
          <AnalysisField label="推荐责任人" value={result?.recommended_owner ?? '-'} />
          <AnalysisField label="建议响应时限" value={result?.suggested_sla ?? '-'} tone="accent" />
        </div>
      ) : status !== 'loading' && status !== 'error' ? (
        <div style={{ ...summaryBoxStyle, marginTop: '18px' }}>
          还没有解析结果。下一轮接入真实 API 后，这里会显示分类、优先级、影响范围、路由对象和 SLA。
        </div>
      ) : null}
    </article>
  )
}
