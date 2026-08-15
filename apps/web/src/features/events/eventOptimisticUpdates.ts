import { calculateCoverage, type AggregateEventResponse, type EventItemAssignment, type EventItemWithAssignments } from '@listcollab/shared'

const optimisticCreatedAt = '1970-01-01T00:00:00.000Z'

type UpsertAssignmentInput = {
  assignment?: EventItemAssignment
  itemId: number
  note: string | null
  participantId: number
  quantity: number
}

function syncItemCoverage(item: EventItemWithAssignments): EventItemWithAssignments {
  const coverage = calculateCoverage(
    item.quantityRequired,
    item.assignments.map((assignment) => assignment.quantity)
  )

  return {
    ...item,
    coverage,
    status: coverage.status,
  }
}

function buildOptimisticAssignmentId(itemId: number, participantId: number): number {
  return -1 * (itemId * 100000 + participantId)
}

/**
 * Applies an optimistic claim create or update to the cached aggregate event response.
 */
export function applyOptimisticAssignment(
  eventData: AggregateEventResponse,
  input: UpsertAssignmentInput
): AggregateEventResponse {
  return {
    ...eventData,
    items: eventData.items.map((item) => {
      if (item.id !== input.itemId) {
        return item
      }

      const nextAssignments = input.assignment
        ? item.assignments.map((assignment) =>
            assignment.id === input.assignment?.id
              ? {
                  ...assignment,
                  note: input.note,
                  participantId: input.participantId,
                  quantity: input.quantity,
                }
              : assignment
          )
        : [
            ...item.assignments,
            {
              createdAt: optimisticCreatedAt,
              id: buildOptimisticAssignmentId(item.id, input.participantId),
              itemId: item.id,
              note: input.note,
              participantId: input.participantId,
              quantity: input.quantity,
            },
          ]

      return syncItemCoverage({
        ...item,
        assignments: nextAssignments,
      })
    }),
  }
}

/**
 * Applies an optimistic claim removal to the cached aggregate event response.
 */
export function removeOptimisticAssignment(
  eventData: AggregateEventResponse,
  assignmentId: number
): AggregateEventResponse {
  return {
    ...eventData,
    items: eventData.items.map((item) => {
      if (!item.assignments.some((assignment) => assignment.id === assignmentId)) {
        return item
      }

      return syncItemCoverage({
        ...item,
        assignments: item.assignments.filter((assignment) => assignment.id !== assignmentId),
      })
    }),
  }
}