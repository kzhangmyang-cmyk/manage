import type { CSSProperties } from 'react'
import type { AttachmentPlaceholderItem } from '../../lib/types'

type AttachmentPlaceholderProps = {
  items: AttachmentPlaceholderItem[]
}

const gridStyle: CSSProperties = {
  display: 'grid',
  gap: '10px',
  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
}

export function AttachmentPlaceholder({ items }: AttachmentPlaceholderProps) {
  return (
    <article className="placeholder-panel">
      <span className="panel-kicker">Attachment placeholder</span>
      <h3 className="panel-title">附件占位</h3>
      <p className="panel-description">
        第一版先不做真实上传，只保留常见附件形态，方便后续演示图片、工单截图或聊天记录补充信息。
      </p>

      <div style={gridStyle}>
        {items.map((item) => (
          <div
            key={item.id}
            style={{
              padding: '14px',
              border: '1px dashed var(--color-border-strong)',
              borderRadius: '16px',
              background: 'rgba(255, 255, 255, 0.62)',
            }}
          >
            <div style={{ fontWeight: 600, color: 'var(--color-text)' }}>{item.name}</div>
            <div style={{ marginTop: '6px', fontSize: '0.88rem', color: 'var(--color-text-soft)' }}>
              {[item.typeLabel, item.sizeLabel].filter(Boolean).join(' · ')}
            </div>
          </div>
        ))}
      </div>
    </article>
  )
}
