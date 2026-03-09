'use client'

import type { IndustryId, IndustryOption } from '../../lib/types'

type TopBarProps = {
  productName: string
  tagline: string
  selectedIndustry: IndustryId
  industryOptions: IndustryOption[]
  onIndustryChange: (industry: IndustryId) => void
}

export function TopBar({
  productName,
  tagline,
  selectedIndustry,
  industryOptions,
  onIndustryChange,
}: TopBarProps) {
  return (
    <header className="topbar">
      <div className="brand-block">
        <div className="brand-row">
          <div className="brand-mark">
            <span className="brand-dot" />
            <span>{productName}</span>
          </div>
          <span className="brand-pill">Build mode / Step A</span>
        </div>
        <div className="brand-tagline">{tagline}</div>
      </div>

      <div className="topbar-actions">
        <label className="control-block">
          <span className="control-label">Industry Version</span>
          <select
            className="control-select"
            value={selectedIndustry}
            onChange={(event) => onIndustryChange(event.target.value as IndustryId)}
          >
            {industryOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>
    </header>
  )
}
