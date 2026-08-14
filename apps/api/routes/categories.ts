import type { Category, CategoryInput } from '@listcollab/shared'
import express, { type Request, type Response } from 'express'
import type { ResultSetHeader, RowDataPacket } from 'mysql2'

import db from '../config/database.js'
import logger from '../logger.js'

type CategoryRow = RowDataPacket & Category;

const router = express.Router();

// GET /api/categories - Get all categories
router.get("/", async (_req: Request, res: Response) => {
  try {
    const [rows] = await db.execute<CategoryRow[]>("SELECT * FROM categories ORDER BY name");
    res.json(rows);
  } catch (error) {
    logger.error({ err: error }, 'Error fetching categories')
    res.status(500).json({ error: "Failed to fetch categories" });
  }
});

// POST /api/categories - Create new category
router.post("/", async (req: Request<Record<string, never>, CategoryRow, CategoryInput>, res: Response) => {
  const { name, icon = "📦" } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: "Name is required" });
  }

  try {
    const [result] = await db.execute<ResultSetHeader>(
      "INSERT INTO categories (name, icon) VALUES (?, ?)",
      [name.trim(), icon]
    );

    const [rows] = await db.execute<CategoryRow[]>("SELECT * FROM categories WHERE id = ?", [
      result.insertId,
    ]);
    res.status(201).json(rows[0]);
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "ER_DUP_ENTRY"
    ) {
      return res.status(400).json({ error: "Category name already exists" });
    }
    logger.error({ err: error }, 'Error creating category')
    res.status(500).json({ error: "Failed to create category" });
  }
});

export default router
