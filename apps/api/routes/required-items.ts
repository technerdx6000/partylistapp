import type { ResultSetHeader, RowDataPacket } from "mysql2";
import type { Request, Response } from "express";
import express from "express";
import type {
  RequiredItem,
  RequiredItemAssignInput,
  RequiredItemInput,
} from "@listcollab/shared";

import pool = require("../config/database");

type RequiredItemRow = RowDataPacket & RequiredItem;
type RequiredItemAssignBody = RequiredItemAssignInput | { person_id?: "" };

const router = express.Router();

// Get all required items
router.get("/", async (_req: Request, res: Response) => {
  try {
    const [rows] = await pool.execute<RequiredItemRow[]>(`
      SELECT ri.*, c.name as category_name, p.name as person_name 
      FROM required_items ri
      LEFT JOIN categories c ON ri.category_id = c.id
      LEFT JOIN people p ON ri.person_id = p.id
      ORDER BY ri.created_at DESC
    `);
    res.json(rows);
  } catch (error) {
    console.error("Error fetching required items:", error);
    res.status(500).json({ error: "Failed to fetch required items" });
  }
});

// Get required item by ID
router.get("/:id", async (req: Request<{ id: string }>, res: Response) => {
  try {
    const [rows] = await pool.execute<RequiredItemRow[]>(
      `
      SELECT ri.*, c.name as category_name, p.name as person_name 
      FROM required_items ri
      LEFT JOIN categories c ON ri.category_id = c.id
      LEFT JOIN people p ON ri.person_id = p.id
      WHERE ri.id = ?
    `,
      [req.params.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Required item not found" });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error("Error fetching required item:", error);
    res.status(500).json({ error: "Failed to fetch required item" });
  }
});

// Create a new required item
router.post("/", async (req: Request<Record<string, never>, RequiredItemRow, RequiredItemInput>, res: Response) => {
  try {
    const {
      name,
      category_id,
      person_id = null,
      is_fulfilled = false,
    } = req.body;

    if (!name || !category_id) {
      return res
        .status(400)
        .json({ error: "Name and category_id are required" });
    }

    const [result] = await pool.execute<ResultSetHeader>(
      "INSERT INTO required_items (name, category_id, person_id, is_fulfilled) VALUES (?, ?, ?, ?)",
      [name, category_id, person_id, is_fulfilled]
    );

    // Fetch the created item with joins
    const [rows] = await pool.execute<RequiredItemRow[]>(
      `
      SELECT ri.*, c.name as category_name, p.name as person_name 
      FROM required_items ri
      LEFT JOIN categories c ON ri.category_id = c.id
      LEFT JOIN people p ON ri.person_id = p.id
      WHERE ri.id = ?
    `,
      [result.insertId]
    );

    res.status(201).json(rows[0]);
  } catch (error) {
    console.error("Error creating required item:", error);
    res.status(500).json({ error: "Failed to create required item" });
  }
});

// Update a required item
router.put("/:id", async (req: Request<{ id: string }, RequiredItemRow, RequiredItemInput>, res: Response) => {
  try {
    const { name, category_id, person_id, is_fulfilled } = req.body;

    if (!name || !category_id) {
      return res
        .status(400)
        .json({ error: "Name and category_id are required" });
    }

    const normalizedPersonId = person_id ?? null;
    const normalizedFulfilled = is_fulfilled ?? normalizedPersonId !== null;

    const [result] = await pool.execute<ResultSetHeader>(
      "UPDATE required_items SET name = ?, category_id = ?, person_id = ?, is_fulfilled = ? WHERE id = ?",
      [name.trim(), category_id, normalizedPersonId, normalizedFulfilled, req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Required item not found" });
    }

    // Fetch the updated item with joins
    const [rows] = await pool.execute<RequiredItemRow[]>(
      `
      SELECT ri.*, c.name as category_name, p.name as person_name 
      FROM required_items ri
      LEFT JOIN categories c ON ri.category_id = c.id
      LEFT JOIN people p ON ri.person_id = p.id
      WHERE ri.id = ?
    `,
      [req.params.id]
    );

    res.json(rows[0]);
  } catch (error) {
    console.error("Error updating required item:", error);
    res.status(500).json({ error: "Failed to update required item" });
  }
});

// Assign/unassign person to required item
router.patch("/:id/assign", async (req: Request<{ id: string }, RequiredItemRow, RequiredItemAssignBody>, res: Response) => {
  try {
    const { person_id } = req.body;

    const normalizedPersonId = person_id === "" ? null : person_id ?? null;

    const [result] = await pool.execute<ResultSetHeader>(
      "UPDATE required_items SET person_id = ?, is_fulfilled = ? WHERE id = ?",
      [normalizedPersonId, normalizedPersonId !== null, req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Required item not found" });
    }

    // Fetch the updated item with joins
    const [rows] = await pool.execute<RequiredItemRow[]>(
      `
      SELECT ri.*, c.name as category_name, p.name as person_name 
      FROM required_items ri
      LEFT JOIN categories c ON ri.category_id = c.id
      LEFT JOIN people p ON ri.person_id = p.id
      WHERE ri.id = ?
    `,
      [req.params.id]
    );

    res.json(rows[0]);
  } catch (error) {
    console.error("Error assigning required item:", error);
    res.status(500).json({ error: "Failed to assign required item" });
  }
});

// Delete a required item
router.delete("/:id", async (req: Request<{ id: string }>, res: Response) => {
  try {
    const [result] = await pool.execute<ResultSetHeader>(
      "DELETE FROM required_items WHERE id = ?",
      [req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Required item not found" });
    }

    res.json({ message: "Required item deleted successfully" });
  } catch (error) {
    console.error("Error deleting required item:", error);
    res.status(500).json({ error: "Failed to delete required item" });
  }
});

export = router;
