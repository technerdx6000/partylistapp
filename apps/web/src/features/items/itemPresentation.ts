import type { EventItemAssignment, EventItemWithAssignments } from '@listcollab/shared'

import type { EventIdentity } from '../../hooks/useEventIdentity'

export type ItemStateMeta = {
  progressLabel: string
  statusLabel: string
}

const itemNameCollator = new Intl.Collator(undefined, { sensitivity: 'base' })

/**
 * Formats a compact participant-by-quantity summary for an item's assignments.
 *
 * @param {EventItemWithAssignments} item - The item whose assignments are being summarised.
 * @param {Map<number, string>} participantsById - Participant names keyed by participant id.
 * @returns {string} A human-readable assignment summary.
 */
export function formatAssignmentSummary(item: EventItemWithAssignments, participantsById: Map<number, string>): string {
  if (item.assignments.length === 0) {
    return item.quantityRequired === null ? 'No one has claimed this contribution yet.' : 'No one has claimed this yet.'
  }

  return item.assignments
    .map((assignment) => `${participantsById.get(assignment.participantId) ?? 'Someone'} ×${assignment.quantity}`)
    .join(' · ')
}

/**
 * Builds the descriptive secondary copy for a contribution or requirement.
 *
 * @param {EventItemWithAssignments} item - The item being rendered.
 * @param {Map<number, string>} participantsById - Participant names keyed by participant id.
 * @returns {string} The descriptive sentence shown under the item name.
 */
export function getContributionSummary(item: EventItemWithAssignments, participantsById: Map<number, string>): string {
  const creatorName = item.createdBy ? participantsById.get(item.createdBy) : null

  if (item.quantityRequired === null) {
    if (item.assignments.length > 0) {
      return `${formatAssignmentSummary(item, participantsById)} is bringing this contribution.`
    }

    return creatorName ? `${creatorName} added this contribution.` : 'Open contribution'
  }

  return formatAssignmentSummary(item, participantsById)
}

/**
 * Determines whether an item should be treated as closed for display ordering.
 *
 * @param {EventItemWithAssignments} item - The item being evaluated.
 * @returns {boolean} True when the item is closed for display purposes.
 */
export function isItemClosedForDisplay(item: EventItemWithAssignments): boolean {
  if (item.quantityRequired === null) {
    return item.coverage.claimed > 0
  }

  return item.status === 'completed' || item.coverage.remaining === 0
}

/**
 * Sorts items so non-closed entries appear before closed ones, with case-insensitive
 * alphabetical ordering by item name inside each group.
 *
 * @param {EventItemWithAssignments} leftItem - The left item to compare.
 * @param {EventItemWithAssignments} rightItem - The right item to compare.
 * @returns {number} A negative number when the left item should sort first.
 */
export function compareItemsForDisplayOrder(
  leftItem: EventItemWithAssignments,
  rightItem: EventItemWithAssignments
): number {
  const leftIsClosed = isItemClosedForDisplay(leftItem)
  const rightIsClosed = isItemClosedForDisplay(rightItem)

  if (leftIsClosed !== rightIsClosed) {
    return leftIsClosed ? 1 : -1
  }

  const nameComparison = itemNameCollator.compare(leftItem.name, rightItem.name)

  if (nameComparison !== 0) {
    return nameComparison
  }

  const exactNameComparison = leftItem.name.localeCompare(rightItem.name)

  if (exactNameComparison !== 0) {
    return exactNameComparison
  }

  return leftItem.id - rightItem.id
}

/**
 * Determines whether an assignment can be edited by the current viewer.
 *
 * @param {EventItemAssignment} assignment - The assignment being rendered.
 * @param {EventIdentity | null} currentIdentity - The participant identity stored for this event, if any.
 * @param {boolean} isManageMode - True when the organiser token is active.
 * @returns {boolean} True when the assignment can be edited from the UI.
 */
export function canEditAssignment(
  assignment: EventItemAssignment,
  currentIdentity: EventIdentity | null,
  isManageMode: boolean
): boolean {
  return isManageMode || currentIdentity?.participantId === assignment.participantId
}

/**
 * Returns the textual state treatment for an item so status does not rely on colour alone.
 *
 * @param {EventItemWithAssignments} item - The item being rendered.
 * @returns {ItemStateMeta} Text labels for the item's state chip and progress copy.
 */
export function getItemStateMeta(item: EventItemWithAssignments): ItemStateMeta {
  if (item.quantityRequired === null) {
    if (item.coverage.claimed === 0) {
      return {
        progressLabel: 'Waiting for someone to bring this contribution',
        statusLabel: 'Open contribution',
      }
    }

    return {
      progressLabel:
        item.status === 'completed' || item.coverage.status === 'completed'
          ? 'Marked complete by the organiser'
          : 'Someone is bringing this contribution',
      statusLabel:
        item.status === 'completed' || item.coverage.status === 'completed'
          ? 'Completed contribution'
          : 'Contribution ready',
    }
  }

  const coveragePrefix = item.coverage.claimed === 0 ? 'Open' : item.coverage.remaining === 0 ? 'Covered' : 'Partly covered'

  if (item.status === 'completed') {
    return {
      progressLabel: 'Marked complete by the organiser',
      statusLabel: `Completed · ${item.coverage.claimed} / ${item.coverage.required}`,
    }
  }

  if (item.coverage.remaining === 0) {
    return {
      progressLabel: 'All required quantities are claimed',
      statusLabel: `Covered · ${item.coverage.claimed} / ${item.coverage.required}`,
    }
  }

  return {
    progressLabel:
      item.coverage.claimed === 0
        ? `${item.coverage.required} still needed`
        : `${item.coverage.remaining} still needed`,
    statusLabel: `${coveragePrefix} · ${item.coverage.claimed} / ${item.coverage.required}`,
  }
}

/**
 * Returns the compact row-status label for the minimal item row.
 *
 * @param {EventItemWithAssignments} item - The item being rendered in row form.
 * @returns {string} The compact status label.
 */
export function getCompactItemStatusLabel(item: EventItemWithAssignments): string {
  if (item.quantityRequired === null) {
    return isItemClosedForDisplay(item) ? 'Closed' : 'Open contribution'
  }

  if (isItemClosedForDisplay(item)) {
    return 'Closed'
  }

  return `Open · ${item.coverage.remaining} left`
}