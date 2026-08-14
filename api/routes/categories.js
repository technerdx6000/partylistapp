const express = require("express");
const router = express.Router();
const db = require("../config/database");

// GET /api/categories - Get all categories
router.get("/", async (req, res) => {
  try {
    const [rows] = await db.execute("SELECT * FROM categories ORDER BY name");
    res.json(rows);
  } catch (error) {
    console.error("Error fetching categories:", error);
    res.status(500).json({ error: "Failed to fetch categories" });
  }
});

// POST /api/categories - Create new category
router.post("/", async (req, res) => {
  const { name, icon = "📦" } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: "Name is required" });
  }

  try {
    const [result] = await db.execute(
      "INSERT INTO categories (name, icon) VALUES (?, ?)",
      [name.trim(), icon]
    );

    const [rows] = await db.execute("SELECT * FROM categories WHERE id = ?", [
      result.insertId,
    ]);
    res.status(201).json(rows[0]);
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(400).json({ error: "Category name already exists" });
    }
    console.error("Error creating category:", error);
    res.status(500).json({ error: "Failed to create category" });
  }
});

module.exports = router;
