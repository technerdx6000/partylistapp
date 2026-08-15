import type { CreateItemRequest, EventItem, UpdateItemRequest } from '@listcollab/shared'
import type { ResultSetHeader } from 'mysql2/promise'

import { type EventItemRow, queryable, type Queryable } from './shared.js'

function mapItemRow(row: EventItemRow): EventItem {
  return {
    id: row.id,
    eventId: row.event_id,
    categoryId: row.category_id,
    name: row.name,
    description: row.description,
    quantityRequired: row.quantity_required,
    status: row.status,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

/**
 * Lists items for an event.
 */
export async function listItemsByEventId(eventId: number, connection?: Queryable): Promise<EventItem[]> {
  const [rows] = await queryable(connection).execute<EventItemRow[]>(
    'SELECT * FROM event_items WHERE event_id = ? ORDER BY created_at, id',
    [eventId]
  )

  return rows.map(mapItemRow)
}

/**
 * Finds an item by event and id.
 */
export async function findItemById(
  eventId: number,
  itemId: number,
  connection?: Queryable
): Promise<EventItem | null> {
  const [rows] = await queryable(connection).execute<EventItemRow[]>(
    'SELECT * FROM event_items WHERE event_id = ? AND id = ? LIMIT 1',
    [eventId, itemId]
  )

  return rows[0] ? mapItemRow(rows[0]) : null
}

/**
 * Creates an item for an event.
 */
export async function createItem(
  eventId: number,
  input: CreateItemRequest,
  connection?: Queryable
): Promise<EventItem> {
  const [result] = await queryable(connection).execute<ResultSetHeader>(
    `
      INSERT INTO event_items (event_id, category_id, name, description, quantity_required, status, created_by)
      VALUES (?, ?, ?, ?, ?, 'open', ?)
    `,
    [
      eventId,
      input.categoryId ?? null,
      input.name,
      input.description ?? null,
      input.quantityRequired ?? null,
      input.createdBy ?? null,
    ]
  )

  const created = await findItemById(eventId, result.insertId, connection)

  if (!created) {
    throw new Error('Created item could not be reloaded')
  }

  return created
}

/**
 * Updates an item within an event.
 */
export async function updateItem(
  eventId: number,
  itemId: number,
  input: UpdateItemRequest,
  connection?: Queryable
): Promise<EventItem | null> {
  const current = await findItemById(eventId, itemId, connection)

  if (!current) {
    return null
  }

  await queryable(connection).execute(
    `
      UPDATE event_items
      SET category_id = ?, name = ?, description = ?, quantity_required = ?, status = ?
      WHERE event_id = ? AND id = ?
    `,
    [
      input.categoryId ?? current.categoryId,
      input.name ?? current.name,
      input.description ?? current.description,
      input.quantityRequired ?? current.quantityRequired,
      input.status ?? current.status,
      eventId,
      itemId,
    ]
  )

  return findItemById(eventId, itemId, connection)
}

/**
 * Deletes an item within an event.
 */
export async function deleteItem(eventId: number, itemId: number, connection?: Queryable): Promise<boolean> {
  const [result] = await queryable(connection).execute<ResultSetHeader>(
    'DELETE FROM event_items WHERE event_id = ? AND id = ?',
    [eventId, itemId]
  )

  return result.affectedRows > 0
}