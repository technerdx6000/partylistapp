import type { Pool, PoolConnection, RowDataPacket } from 'mysql2/promise'

import { pool } from '../db/pool.js'

export type Queryable = Pool | PoolConnection

export type EventRow = RowDataPacket & {
    id: number
    name: string
    description: string | null
    event_date: string | null
    location: string | null
    share_token: string
    admin_token: string
    created_at: string | Date
    updated_at: string | Date
}

export type EventParticipantRow = RowDataPacket & {
    id: number
    event_id: number
    name: string
    created_at: string | Date
}

export type EventCategoryRow = RowDataPacket & {
    id: number
    event_id: number
    name: string
    icon: string | null
    sort_order: number
    created_at: string | Date
}

export type EventItemRow = RowDataPacket & {
    id: number
    event_id: number
    category_id: number | null
    name: string
    description: string | null
    quantity_required: number | null
    status: 'open' | 'covered' | 'completed'
    created_by: number | null
    created_at: string | Date
    updated_at: string | Date
}

export type EventItemAssignmentRow = RowDataPacket & {
    id: number
    item_id: number
    participant_id: number
    quantity: number
    note: string | null
    created_at: string | Date
}

export function toIsoString(value: string | Date): string {
    return value instanceof Date ? value.toISOString() : value
}

export function queryable(connection?: Queryable): Queryable {
    return connection ?? pool
}