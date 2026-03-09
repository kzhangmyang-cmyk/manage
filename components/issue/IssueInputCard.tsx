'use client'

import type { CSSProperties } from 'react'

type IssueInputCardProps = {
  industryLabel: string
  value: string
  placeholder: string
  suggestedDepartments: string[]
  isSubmitting: boolean
  onChange: (value: string) => void
  onSubmit: () => Promise<void> | void
}

const fieldStyle: CSSProperties = {
  display: 'grid',
  gap: '10px',
  marginTop: '18px',
}

const labelStyle: CSSProperties = {
  fontSize: '0.78rem',
  fontWeight: 700,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: 'var(--color-text-muted)',
}

const textareaStyle: CSSProperties = {
  width: '100%',
  minHeight: '220px',
  resize: 'vertical',
  padding: '18px',
  border: '1px solid var(--color-border-soft)',
  borderRadius: '18px',
  background: 'rgba(255, 255, 255, 0.92)',
  color: 'var(--color-text)',
  lineHeight: 1.7,
  outline: 'none',
}

const footerStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: '16px',
  marginTop: '18px',
  flexWrap: 'wrap',
}

const noteStyle: CSSProperties = {
  maxWidth: '46ch',
  fontSize: '0.92rem',
  lineHeight: 1.6,
  color: 'var(--color-text-soft)',
}

export function IssueInputCard({
  industryLabel,
  value,
  placeholder,
  suggestedDepartments,
  isSubmitting,
  onChange,
  onSubmit,
}: IssueInputCardProps) {
  const canSubmit = value.trim().length > 0 && !isSubmitting

  return (
    <article className="placeholder-panel is-primary">
      <span className="panel-kicker">Issue intake</span>
      <h3 className="panel-title">用自然语言接住一个内部问题</h3>
      <p className="panel-description">
        当前行业为 {industryLabel}。这一步只要求一线成员把问题说清楚，不要求填写复杂表单。
      </p>

      <div className="panel-chips">
        <span className="panel-chip">员工 / 门店 / 部门成员</span>
        <span className="panel-chip">自然语言输入</span>
        <span className="panel-chip">后续接 AI 解析</span>
      </div>

      <div style={fieldStyle}>
        <label htmlFor="issue-draft" style={labelStyle}>
          Problem description
        </label>
        <textarea
          id="issue-draft"
          style={textareaStyle}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
        />
      </div>

      <div className="panel-chips" style={{ marginTop: '18px' }}>
        {suggestedDepartments.map((department) => (
          <span key={department} className="panel-chip">
            建议路由候选：{department}
          </span>
        ))}
      </div>

      <div style={footerStyle}>
        <div style={noteStyle}>
          {isSubmitting
            ? '正在调用真实 AI 解析接口，并把 Agent Activity 绑定到这次请求生命周期。'
            : '点击后会调用真实 AI 解析接口，返回问题类型、优先级、影响范围、推荐责任人和建议 SLA。'}
        </div>

        <button
          type="button"
          onClick={onSubmit}
          disabled={!canSubmit}
          style={{
            padding: '12px 18px',
            borderRadius: '999px',
            border: 'none',
            cursor: canSubmit ? 'pointer' : 'not-allowed',
            color: canSubmit ? '#f5f6f3' : 'rgba(245, 246, 243, 0.7)',
            background: canSubmit ? 'var(--color-accent-strong)' : 'rgba(20, 58, 52, 0.45)',
            boxShadow: 'var(--shadow-soft)',
          }}
        >
          {isSubmitting ? 'AI 解析中...' : '继续到 AI 解析'}
        </button>
      </div>
    </article>
  )
}
