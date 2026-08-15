import { calculateCoverage, type EventItemWithAssignments } from '@listcollab/shared'

export type CategoryCoverageSummary = {
  coveredItems: number
  completedContributions: number
  totalItems: number
}

/**
 * Summarises event-level coverage while excluding ad-hoc contributions from the denominator.
 */
export function getEventCoverageSummary(items: readonly EventItemWithAssignments[]) {
  const totals = items.reduce(
    (summary, item) => {
      if (item.quantityRequired === null) {
        return summary
      }

      return {
        claimed: summary.claimed + item.coverage.claimed,
        required: summary.required + item.quantityRequired,
      }
    },
    { claimed: 0, required: 0 }
  )

  return calculateCoverage(totals.required, [totals.claimed])
}

/**
 * Summarises category-level completion counts while excluding ad-hoc contributions from required totals.
 */
export function getCategoryCoverageSummary(items: readonly EventItemWithAssignments[]): CategoryCoverageSummary {
  return items.reduce(
    (summary, item) => {
      if (item.quantityRequired === null) {
        return {
          ...summary,
          completedContributions: summary.completedContributions + (item.coverage.claimed > 0 ? 1 : 0),
        }
      }

      return {
        ...summary,
        coveredItems: summary.coveredItems + (item.coverage.status === 'covered' ? 1 : 0),
        totalItems: summary.totalItems + 1,
      }
    },
    { completedContributions: 0, coveredItems: 0, totalItems: 0 }
  )
}