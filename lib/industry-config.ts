import { industries } from '../mock/industries'
import type { IndustryData, IndustryId, IndustryOption } from './types'

const industryMap = industries.reduce(
  (accumulator, industry) => {
    accumulator[industry.id] = industry
    return accumulator
  },
  {} as Record<IndustryId, IndustryData>,
)

export function getIndustryOptions(): IndustryOption[] {
  return industries.map((industry) => ({
    value: industry.id,
    label: industry.label,
  }))
}

export function getIndustryData(industryId: IndustryId): IndustryData {
  return industryMap[industryId] ?? industries[0]
}

export function getDefaultIssueText(industryId: IndustryId): string {
  return getIndustryData(industryId).exampleIssues[0]?.text ?? ''
}
