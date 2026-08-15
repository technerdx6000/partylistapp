import type { CreateEventRequest, Event, EventWithAdminToken, UpdateEventRequest } from '@listcollab/shared'
import type { PoolConnection, ResultSetHeader } from 'mysql2/promise'

import { type EventRow, queryable, type Queryable } from './shared.js'

function mapEventRow(row: EventRow): EventWithAdminToken {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    eventDate: row.event_date,
    location: row.location,
    shareToken: row.share_token,
    adminToken: row.admin_token,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function stripAdminToken(event: EventWithAdminToken): Event {
  const { adminToken: _adminToken, ...rest } = event
  return rest
}

/**
 * Finds an event by its share token.
 */
export async function findEventByShareToken(
  shareToken: string,
  connection?: Queryable
): Promise<EventWithAdminToken | null> {
  const [rows] = await queryable(connection).execute<EventRow[]>(
    'SELECT * FROM events WHERE share_token = ? LIMIT 1',
    [shareToken]
  )

  return rows[0] ? mapEventRow(rows[0]) : null
}

/**
 * Finds an event by its admin token.
 */
export async function findEventByAdminToken(
  adminToken: string,
  connection?: Queryable
): Promise<EventWithAdminToken | null> {
  const [rows] = await queryable(connection).execute<EventRow[]>(
    'SELECT * FROM events WHERE admin_token = ? LIMIT 1',
    [adminToken]
  )

  return rows[0] ? mapEventRow(rows[0]) : null
}

/**
 * Finds an event by its database id.
 */
export async function findEventById(
  eventId: number,
  connection?: Queryable
): Promise<EventWithAdminToken | null> {
  const [rows] = await queryable(connection).execute<EventRow[]>(
    'SELECT * FROM events WHERE id = ? LIMIT 1',
    [eventId]
  )

  return rows[0] ? mapEventRow(rows[0]) : null
}

/**
 * Creates an event with its generated share and admin tokens.
 */
export async function createEvent(
  input: CreateEventRequest,
  shareToken: string,
  adminToken: string,
  connection?: Queryable
): Promise<EventWithAdminToken> {
  const executor = queryable(connection)
  const [result] = await executor.execute<ResultSetHeader>(
    `
      INSERT INTO events (name, description, event_date, location, share_token, admin_token)
      VALUES (?, ?, ?, ?, ?, ?)
    `,
    [
      input.name,
      input.description ?? null,
      input.eventDate ?? null,
      input.location ?? null,
      shareToken,
      adminToken,
    ]
  )

  const created = await findEventById(result.insertId, connection)

  if (!created) {
    throw new Error('Created event could not be reloaded')
  }

  return created
}

/**
 * Updates event fields and returns the persisted event.
 */
export async function updateEvent(
  eventId: number,
  input: UpdateEventRequest,
  connection?: Queryable
): Promise<EventWithAdminToken | null> {
  const current = await findEventById(eventId, connection)

  if (!current) {
    return null
  }

  await queryable(connection).execute(
    `
      UPDATE events
      SET name = ?, description = ?, event_date = ?, location = ?
      WHERE id = ?
    `,
    [
      input.name ?? current.name,
      input.description ?? current.description,
      input.eventDate ?? current.eventDate,
      input.location ?? current.location,
      eventId,
    ]
  )

  return findEventById(eventId, connection)
}

/**
 * Deletes an event by id.
 */
export async function deleteEvent(eventId: number, connection?: Queryable): Promise<boolean> {
  const [result] = await queryable(connection).execute<ResultSetHeader>(
    'DELETE FROM events WHERE id = ?',
    [eventId]
  )

  return result.affectedRows > 0
}

/**
 * Removes the admin token from an internal event record for public API responses.
 */
export function toPublicEvent(event: EventWithAdminToken): Event {
  return stripAdminToken(event)
}