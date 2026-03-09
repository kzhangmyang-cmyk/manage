'use client'

import type { DemoStep, StepTabItem } from '../../lib/types'

type StepTabsProps = {
  items: StepTabItem[]
  currentStep: DemoStep
  disabledSteps?: DemoStep[]
  onStepChange: (step: DemoStep) => void
}

export function StepTabs({ items, currentStep, disabledSteps = [], onStepChange }: StepTabsProps) {
  return (
    <nav className="step-tabs" aria-label="Demo step navigation">
      {items.map((item, index) => {
        const isActive = item.value === currentStep
        const isDisabled = disabledSteps.includes(item.value)

        return (
          <button
            key={item.value}
            type="button"
            className={`step-tab ${isActive ? 'is-active' : ''} ${isDisabled ? 'is-disabled' : ''}`.trim()}
            onClick={() => onStepChange(item.value)}
            aria-pressed={isActive}
            aria-disabled={isDisabled}
            disabled={isDisabled}
          >
            <span className="step-index">0{index + 1}</span>
            <span className="step-state">{isDisabled ? '待解锁' : isActive ? '当前' : '可查看'}</span>
            <span className="step-label">{item.label}</span>
            <span className="step-caption">{item.caption}</span>
          </button>
        )
      })}
    </nav>
  )
}
