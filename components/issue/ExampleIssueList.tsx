'use client'

import type { CSSProperties } from 'react'
import type { ExampleIssue } from '../../lib/types'

type ExampleIssueListProps = {
  industryLabel: string
  issues: ExampleIssue[]
  selectedText: string
  onSelectIssue: (text: string) => void
  onRunIssue?: (text: string) => Promise<void> | void
}

const listStyle: CSSProperties = {
  display: 'grid',
  gap: '12px',
}

export function ExampleIssueList({
  industryLabel,
  issues,
  selectedText,
  onSelectIssue,
  onRunIssue,
}: ExampleIssueListProps) {
  return (
    <article className="placeholder-panel">
      <span className="panel-kicker">Example issues</span>
      <h3 className="panel-title">{industryLabel}示例问题</h3>
      <p className="panel-description">
        这一列用来快速进入演示故事。你可以先回填到输入框，也可以直接触发一次完整演示。
      </p>

      <div style={listStyle}>
        {issues.map((issue) => {
          const isSelected = selectedText.trim() === issue.text.trim()

          return (
            <div
              key={issue.id}
              style={{
                display: 'grid',
                gap: '8px',
                padding: '16px',
                borderRadius: '18px',
                border: isSelected
                  ? '1px solid rgba(32, 106, 94, 0.38)'
                  : '1px solid var(--color-border-soft)',
                background: isSelected
                  ? 'rgba(229, 241, 238, 0.82)'
                  : 'rgba(255, 255, 255, 0.72)',
                textAlign: 'left',
              }}
            >
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-text-muted)' }}>
                {issue.title}
              </span>
              <span style={{ fontWeight: 600, lineHeight: 1.5, color: 'var(--color-text)' }}>
                {issue.text}
              </span>

              {(issue.pathHint || issue.actionHint) ? (
                <div className="panel-chips" style={{ marginTop: '2px' }}>
                  {issue.pathHint ? <span className="panel-chip">路径：{issue.pathHint}</span> : null}
                  {issue.actionHint ? <span className="panel-chip">动作：{issue.actionHint}</span> : null}
                </div>
              ) : null}

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '4px' }}>
                <button
                  type="button"
                  onClick={() => onSelectIssue(issue.text)}
                  style={secondaryButtonStyle}
                >
                  填入输入框
                </button>

                {onRunIssue ? (
                  <button
                    type="button"
                    onClick={() => {
                      void onRunIssue(issue.text)
                    }}
                    style={primaryButtonStyle}
                  >
                    直接演示
                  </button>
                ) : null}
              </div>
            </div>
          )
        })}
      </div>
    </article>
  )
}

const primaryButtonStyle: CSSProperties = {
  padding: '10px 12px',
  borderRadius: '999px',
  border: 'none',
  cursor: 'pointer',
  color: '#f5f6f3',
  background: 'var(--color-accent-strong)',
}

const secondaryButtonStyle: CSSProperties = {
  padding: '10px 12px',
  borderRadius: '999px',
  border: '1px solid var(--color-border-soft)',
  cursor: 'pointer',
  color: 'var(--color-text-soft)',
  background: 'rgba(255, 255, 255, 0.84)',
}
