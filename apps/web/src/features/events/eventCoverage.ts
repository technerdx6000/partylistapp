import { calculateCoverage, type EventItemWithAssignments } from '@listcollab/shared'

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