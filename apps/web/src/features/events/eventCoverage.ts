import type { EventItemWithAssignments } from '@listcollab/shared'

export type ItemProgressSummary = {
  readyItems: number
  totalItems: number
}

function isReadyItem(item: EventItemWithAssignments): boolean {
  if (item.quantityRequired === null) {
    return item.coverage.claimed > 0
  }

  return (item.coverage.remaining ?? 0) === 0 || item.coverage.status === 'covered' || item.coverage.status === 'completed'
}

/**
 * Summarises event-level progress using overall item counts rather than quantity totals.
 */
export function getEventCoverageSummary(items: readonly EventItemWithAssignments[]): ItemProgressSummary {
  return items.reduce(
    (summary, item) => ({
      readyItems: summary.readyItems + (isReadyItem(item) ? 1 : 0),
      totalItems: summary.totalItems + 1,
    }),
    { readyItems: 0, totalItems: 0 }
  )
}

/**
 * Summarises category-level progress using overall item counts rather than quantity totals.
 */
export function getCategoryCoverageSummary(items: readonly EventItemWithAssignments[]): ItemProgressSummary {
  return items.reduce(
    (summary, item) => ({
      readyItems: summary.readyItems + (isReadyItem(item) ? 1 : 0),
      totalItems: summary.totalItems + 1,
    }),
    { readyItems: 0, totalItems: 0 }
  )
}