'use client'

import type { ReactNode } from 'react'

type MetaItem = {
  label: string
  value: string
  note: string
}

type PageShellProps = {
  title: string
  description: string
  meta: MetaItem[]
  children: ReactNode
}

export function PageShell({ title, description, meta, children }: PageShellProps) {
  return (
    <main className="page-shell">
      {children}

      <section className="hero-shell">
        <div className="hero-grid">
          <div>
            <span className="eyebrow">Enterprise AI ops demo</span>
            <h1 className="hero-title">{title}</h1>
            <p className="hero-description">{description}</p>
          </div>

          <div className="hero-meta">
            {meta.map((item) => (
              <article key={item.label} className="meta-card">
                <span className="meta-label">{item.label}</span>
                <span className="meta-value">{item.value}</span>
                <div className="meta-note">{item.note}</div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  )
}
