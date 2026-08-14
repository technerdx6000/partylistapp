// filepath: c:\Users\techn\Documents\apps\partylistapp\backend\server.js
import cors from "cors";
import type { NextFunction, Request, Response } from "express";
import express from "express";
import helmet from "helmet";
import dotenv from "dotenv";

import db = require("./config/database");

const peopleRoutes = require("./routes/people");
const itemsRoutes = require("./routes/items");
const categoriesRoutes = require("./routes/categories");
const requiredItemsRoutes = require("./routes/required-items");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  })
);
app.use(express.json());

// Routes
app.use("/api/people", peopleRoutes);
app.use("/api/items", itemsRoutes);
app.use("/api/categories", categoriesRoutes);
app.use("/api/required-items", requiredItemsRoutes);

app.get("/api/health", async (_req: Request, res: Response) => {
  try {
    await db.execute("SELECT 1");

    res.status(200).json({ status: "ok", db: true });
  } catch (_error) {
    res.status(503).json({ status: "degraded", db: false });
  }
});

// Error handling middleware
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({
    error: "Something went wrong!",
    message:
      process.env.NODE_ENV === "development"
        ? err.message
        : "Internal Server Error",
  });
});

// 404 handler
app.use("*", (_req: Request, res: Response) => {
  res.status(404).json({ error: "Route not found" });
});

app.listen(PORT, () => {
  console.log(`Party List API server running on port ${PORT}`);
});
