import type { ResultSetHeader, RowDataPacket } from "mysql2";
import type { Request, Response } from "express";
import express from "express";

import db = require("../config/database");

type CategoryRow = RowDataPacket & {
  id: number;
  name: string;
  icon: string;
  created_at: string;
  updated_at: string;
};

type CategoryBody = {
  name?: string;
  icon?: string;
};

const router = express.Router();

// GET /api/categories - Get all categories
router.get("/", async (_req: Request, res: Response) => {
  try {
    const [rows] = await db.execute<CategoryRow[]>("SELECT * FROM categories ORDER BY name");
    res.json(rows);
  } catch (error) {
    console.error("Error fetching categories:", error);
    res.status(500).json({ error: "Failed to fetch categories" });
  }
});

// POST /api/categories - Create new category
router.post("/", async (req: Request<Record<string, never>, CategoryRow, CategoryBody>, res: Response) => {
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
    console.error("Error creating category:", error);
    res.status(500).json({ error: "Failed to create category" });
  }
});

export = router;
