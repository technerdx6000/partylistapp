import type { Item, ItemCreateInput, ItemUpdateInput } from '@listcollab/shared'
import express, { type Request, type Response } from 'express'
import type { ResultSetHeader, RowDataPacket } from 'mysql2'

import db from '../config/database.js'
import logger from '../logger.js'

type ItemRow = RowDataPacket & Item;

const router = express.Router();

const hasOnlyAllowedFields = (
  body: Record<string, unknown> | null | undefined,
  allowedFields: readonly string[]
) => {
  const bodyKeys = Object.keys(body ?? {});

  return bodyKeys.every((key) => allowedFields.includes(key));
};

// GET /api/items - Get all items with category and person info
router.get("/", async (_req: Request, res: Response) => {
  try {
    const [rows] = await db.execute<ItemRow[]>(`
      SELECT i.*, c.name as category_name, c.icon as category_icon, p.name as person_name
      FROM items i
      JOIN categories c ON i.category_id = c.id
      JOIN people p ON i.person_id = p.id
      ORDER BY p.name, i.name
    `);
    res.json(rows);
  } catch (error) {
    logger.error({ err: error }, 'Error fetching items')
    res.status(500).json({ error: "Failed to fetch items" });
  }
});

// GET /api/items/person/:personId - Get items for specific person
router.get("/person/:personId", async (req: Request<{ personId: string }>, res: Response) => {
  try {
    const [rows] = await db.execute<ItemRow[]>(
      `
      SELECT i.*, c.name as category_name, c.icon as category_icon
      FROM items i
      JOIN categories c ON i.category_id = c.id
      WHERE i.person_id = ?
      ORDER BY i.name
    `,
      [req.params.personId]
    );
    res.json(rows);
  } catch (error) {
    logger.error({ err: error }, 'Error fetching items for person')
    res.status(500).json({ error: "Failed to fetch items for person" });
  }
});

// POST /api/items - Create new item
router.post("/", async (req: Request<Record<string, never>, ItemRow, ItemCreateInput>, res: Response) => {
  const { name, category_id, person_id } = req.body;

  if (!name || !name.trim() || !category_id || !person_id) {
    return res
      .status(400)
      .json({ error: "Name, category_id, and person_id are required" });
  }

  try {
    const [result] = await db.execute<ResultSetHeader>(
      "INSERT INTO items (name, category_id, person_id) VALUES (?, ?, ?)",
      [name.trim(), category_id, person_id]
    );

    const [rows] = await db.execute<ItemRow[]>(
      `
      SELECT i.*, c.name as category_name, c.icon as category_icon, p.name as person_name
      FROM items i
      JOIN categories c ON i.category_id = c.id
      JOIN people p ON i.person_id = p.id
      WHERE i.id = ?
    `,
      [result.insertId]
    );

    res.status(201).json(rows[0]);
  } catch (error) {
    logger.error({ err: error }, 'Error creating item')
    res.status(500).json({ error: "Failed to create item" });
  }
});

// PUT /api/items/:id - Update item
router.put("/:id", async (req: Request<{ id: string }, ItemRow, ItemUpdateInput>, res: Response) => {
  const { name, category_id } = req.body;

  if (!hasOnlyAllowedFields(req.body, ["name", "category_id"])) {
    return res.status(400).json({ error: "Unexpected fields in request body" });
  }

  if (!name || !name.trim() || !category_id) {
    return res.status(400).json({ error: "Name and category_id are required" });
  }

  try {
    const [result] = await db.execute<ResultSetHeader>(
      "UPDATE items SET name = ?, category_id = ? WHERE id = ?",
      [name.trim(), category_id, req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Item not found" });
    }

    const [rows] = await db.execute<ItemRow[]>(
      `
      SELECT i.*, c.name as category_name, c.icon as category_icon, p.name as person_name
      FROM items i
      JOIN categories c ON i.category_id = c.id
      JOIN people p ON i.person_id = p.id
      WHERE i.id = ?
    `,
      [req.params.id]
    );

    res.json(rows[0]);
  } catch (error) {
    logger.error({ err: error }, 'Error updating item')
    res.status(500).json({ error: "Failed to update item" });
  }
});

// DELETE /api/items/:id - Delete item
router.delete("/:id", async (req: Request<{ id: string }>, res: Response) => {
  try {
    const [result] = await db.execute<ResultSetHeader>("DELETE FROM items WHERE id = ?", [
      req.params.id,
    ]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Item not found" });
    }

    res.json({ message: "Item deleted successfully" });
  } catch (error) {
    logger.error({ err: error }, 'Error deleting item')
    res.status(500).json({ error: "Failed to delete item" });
  }
});

export default router
