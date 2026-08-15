import type {
    CreateParticipantRequest,
    EventParticipant,
    UpdateParticipantRequest,
} from '@listcollab/shared'
import type { ResultSetHeader } from 'mysql2/promise'

import { type EventParticipantRow, queryable, type Queryable, toIsoString } from './shared.js'

function mapParticipantRow(row: EventParticipantRow): EventParticipant {
    return {
        id: row.id,
        eventId: row.event_id,
        name: row.name,
        createdAt: toIsoString(row.created_at),
    }
}

/**
 * Lists participants for an event.
 */
export async function listParticipantsByEventId(
    eventId: number,
    connection?: Queryable
): Promise<EventParticipant[]> {
    const [rows] = await queryable(connection).execute<EventParticipantRow[]>(
        'SELECT * FROM event_participants WHERE event_id = ? ORDER BY name',
        [eventId]
    )

    return rows.map(mapParticipantRow)
}

/**
 * Finds a participant by event and id.
 */
export async function findParticipantById(
    eventId: number,
    participantId: number,
    connection?: Queryable
): Promise<EventParticipant | null> {
    const [rows] = await queryable(connection).execute<EventParticipantRow[]>(
        'SELECT * FROM event_participants WHERE event_id = ? AND id = ? LIMIT 1',
        [eventId, participantId]
    )

    return rows[0] ? mapParticipantRow(rows[0]) : null
}

/**
 * Finds a participant by event and name.
 */
export async function findParticipantByName(
    eventId: number,
    name: string,
    connection?: Queryable
): Promise<EventParticipant | null> {
    const [rows] = await queryable(connection).execute<EventParticipantRow[]>(
        'SELECT * FROM event_participants WHERE event_id = ? AND name = ? LIMIT 1',
        [eventId, name]
    )

    return rows[0] ? mapParticipantRow(rows[0]) : null
}

/**
 * Creates a participant for an event.
 */
export async function createParticipant(
    eventId: number,
    input: CreateParticipantRequest,
    connection?: Queryable
): Promise<EventParticipant> {
    const [result] = await queryable(connection).execute<ResultSetHeader>(
        'INSERT INTO event_participants (event_id, name) VALUES (?, ?)',
        [eventId, input.name]
    )

    const created = await findParticipantById(eventId, result.insertId, connection)

    if (!created) {
        throw new Error('Created participant could not be reloaded')
    }

    return created
}

/**
 * Updates a participant name within an event.
 */
export async function updateParticipant(
    eventId: number,
    participantId: number,
    input: UpdateParticipantRequest,
    connection?: Queryable
): Promise<EventParticipant | null> {
    const [result] = await queryable(connection).execute<ResultSetHeader>(
        'UPDATE event_participants SET name = ? WHERE event_id = ? AND id = ?',
        [input.name, eventId, participantId]
    )

    if (result.affectedRows === 0) {
        return null
    }

    return findParticipantById(eventId, participantId, connection)
}

/**
 * Deletes a participant within an event.
 */
export async function deleteParticipant(
    eventId: number,
    participantId: number,
    connection?: Queryable
): Promise<boolean> {
    const [result] = await queryable(connection).execute<ResultSetHeader>(
        'DELETE FROM event_participants WHERE event_id = ? AND id = ?',
        [eventId, participantId]
    )

    return result.affectedRows > 0
}