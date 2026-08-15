import type {
    CreateAssignmentRequest,
    EventItemAssignment,
    UpdateAssignmentRequest,
} from '@listcollab/shared'
import type { ResultSetHeader } from 'mysql2/promise'

import { type EventItemAssignmentRow, queryable, type Queryable, toIsoString } from './shared.js'

function mapAssignmentRow(row: EventItemAssignmentRow): EventItemAssignment {
    return {
        id: row.id,
        itemId: row.item_id,
        participantId: row.participant_id,
        quantity: row.quantity,
        note: row.note,
        createdAt: toIsoString(row.created_at),
    }
}

/**
 * Lists assignments for an event by joining through event items.
 */
export async function listAssignmentsByEventId(
    eventId: number,
    connection?: Queryable
): Promise<EventItemAssignment[]> {
    const [rows] = await queryable(connection).execute<EventItemAssignmentRow[]>(
        `
      SELECT eia.*
      FROM event_item_assignments eia
      JOIN event_items ei ON ei.id = eia.item_id
      WHERE ei.event_id = ?
      ORDER BY eia.created_at, eia.id
    `,
        [eventId]
    )

    return rows.map(mapAssignmentRow)
}

/**
 * Lists assignments for one item within an event.
 */
export async function listAssignmentsByItemId(
    eventId: number,
    itemId: number,
    connection?: Queryable
): Promise<EventItemAssignment[]> {
    const [rows] = await queryable(connection).execute<EventItemAssignmentRow[]>(
        `
      SELECT eia.*
      FROM event_item_assignments eia
      JOIN event_items ei ON ei.id = eia.item_id
      WHERE ei.event_id = ? AND eia.item_id = ?
      ORDER BY eia.created_at, eia.id
    `,
        [eventId, itemId]
    )

    return rows.map(mapAssignmentRow)
}

/**
 * Finds an assignment by event and id.
 */
export async function findAssignmentById(
    eventId: number,
    assignmentId: number,
    connection?: Queryable
): Promise<EventItemAssignment | null> {
    const [rows] = await queryable(connection).execute<EventItemAssignmentRow[]>(
        `
      SELECT eia.*
      FROM event_item_assignments eia
      JOIN event_items ei ON ei.id = eia.item_id
      WHERE ei.event_id = ? AND eia.id = ?
      LIMIT 1
    `,
        [eventId, assignmentId]
    )

    return rows[0] ? mapAssignmentRow(rows[0]) : null
}

/**
 * Creates or updates a single assignment row for a participant/item pair.
 */
export async function upsertAssignment(
    itemId: number,
    input: CreateAssignmentRequest | UpdateAssignmentRequest,
    connection?: Queryable
): Promise<EventItemAssignment> {
    const executor = queryable(connection)
    const [existingRows] = await executor.execute<EventItemAssignmentRow[]>(
        'SELECT * FROM event_item_assignments WHERE item_id = ? AND participant_id = ? LIMIT 1',
        [itemId, input.participantId]
    )

    const existing = existingRows[0]

    if (existing) {
        await executor.execute(
            'UPDATE event_item_assignments SET quantity = ?, note = ? WHERE id = ?',
            [input.quantity, input.note ?? null, existing.id]
        )
        const [updatedRows] = await executor.execute<EventItemAssignmentRow[]>(
            'SELECT * FROM event_item_assignments WHERE id = ? LIMIT 1',
            [existing.id]
        )

        if (!updatedRows[0]) {
            throw new Error('Updated assignment could not be reloaded')
        }

        return mapAssignmentRow(updatedRows[0])
    }

    const [result] = await executor.execute<ResultSetHeader>(
        'INSERT INTO event_item_assignments (item_id, participant_id, quantity, note) VALUES (?, ?, ?, ?)',
        [itemId, input.participantId, input.quantity, input.note ?? null]
    )

    const [createdRows] = await executor.execute<EventItemAssignmentRow[]>(
        'SELECT * FROM event_item_assignments WHERE id = ? LIMIT 1',
        [result.insertId]
    )

    if (!createdRows[0]) {
        throw new Error('Created assignment could not be reloaded')
    }

    return mapAssignmentRow(createdRows[0])
}

/**
 * Deletes an assignment by event and id.
 */
export async function deleteAssignment(
    eventId: number,
    assignmentId: number,
    connection?: Queryable
): Promise<boolean> {
    const [result] = await queryable(connection).execute<ResultSetHeader>(
        `
      DELETE eia
      FROM event_item_assignments eia
      JOIN event_items ei ON ei.id = eia.item_id
      WHERE ei.event_id = ? AND eia.id = ?
    `,
        [eventId, assignmentId]
    )

    return result.affectedRows > 0
}