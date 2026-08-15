import type {
    CreateCategoryRequest,
    EventCategory,
    UpdateCategoryRequest,
} from '@listcollab/shared'
import type { ResultSetHeader } from 'mysql2/promise'

import { type EventCategoryRow, queryable, type Queryable, toIsoString } from './shared.js'

function mapCategoryRow(row: EventCategoryRow): EventCategory {
    return {
        id: row.id,
        eventId: row.event_id,
        name: row.name,
        icon: row.icon,
        sortOrder: row.sort_order,
        createdAt: toIsoString(row.created_at),
    }
}

/**
 * Lists categories for an event.
 */
export async function listCategoriesByEventId(eventId: number, connection?: Queryable): Promise<EventCategory[]> {
    const [rows] = await queryable(connection).execute<EventCategoryRow[]>(
        'SELECT * FROM event_categories WHERE event_id = ? ORDER BY sort_order, name',
        [eventId]
    )

    return rows.map(mapCategoryRow)
}

/**
 * Finds a category by event and id.
 */
export async function findCategoryById(
    eventId: number,
    categoryId: number,
    connection?: Queryable
): Promise<EventCategory | null> {
    const [rows] = await queryable(connection).execute<EventCategoryRow[]>(
        'SELECT * FROM event_categories WHERE event_id = ? AND id = ? LIMIT 1',
        [eventId, categoryId]
    )

    return rows[0] ? mapCategoryRow(rows[0]) : null
}

/**
 * Creates a category for an event.
 */
export async function createCategory(
    eventId: number,
    input: CreateCategoryRequest,
    connection?: Queryable
): Promise<EventCategory> {
    const [result] = await queryable(connection).execute<ResultSetHeader>(
        'INSERT INTO event_categories (event_id, name, icon, sort_order) VALUES (?, ?, ?, ?)',
        [eventId, input.name, input.icon ?? null, input.sortOrder ?? 0]
    )

    const created = await findCategoryById(eventId, result.insertId, connection)

    if (!created) {
        throw new Error('Created category could not be reloaded')
    }

    return created
}

/**
 * Updates a category within an event.
 */
export async function updateCategory(
    eventId: number,
    categoryId: number,
    input: UpdateCategoryRequest,
    connection?: Queryable
): Promise<EventCategory | null> {
    const current = await findCategoryById(eventId, categoryId, connection)

    if (!current) {
        return null
    }

    await queryable(connection).execute(
        'UPDATE event_categories SET name = ?, icon = ?, sort_order = ? WHERE event_id = ? AND id = ?',
        [
            input.name ?? current.name,
            input.icon ?? current.icon,
            input.sortOrder ?? current.sortOrder,
            eventId,
            categoryId,
        ]
    )

    return findCategoryById(eventId, categoryId, connection)
}

/**
 * Deletes a category within an event.
 */
export async function deleteCategory(
    eventId: number,
    categoryId: number,
    connection?: Queryable
): Promise<boolean> {
    const [result] = await queryable(connection).execute<ResultSetHeader>(
        'DELETE FROM event_categories WHERE event_id = ? AND id = ?',
        [eventId, categoryId]
    )

    return result.affectedRows > 0
}