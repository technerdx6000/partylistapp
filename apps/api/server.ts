import cors from "cors";
import dotenv from "dotenv";
import express, { type NextFunction, type Request, type Response } from "express";
import helmet from "helmet";

import db from './config/database.js'
import logger from './logger.js'
import categoriesRoutes from './routes/categories.js'
import itemsRoutes from './routes/items.js'
import peopleRoutes from './routes/people.js'
import requiredItemsRoutes from './routes/required-items.js'

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

app.get('/api/health', async (_req: Request, res: Response) => {
  try {
    await db.execute('SELECT 1')

    res.status(200).json({ status: 'ok', db: true })
  } catch {
    res.status(503).json({ status: 'degraded', db: false })
  }
})

// Error handling middleware
app.use((err: Error, _req: Request, res: Response, next: NextFunction) => {
  void next
  logger.error({ err }, 'Unhandled API error')
  res.status(500).json({
    error: 'Something went wrong!',
    message:
      process.env.NODE_ENV === 'development'
        ? err.message
        : 'Internal Server Error',
  })
})

// 404 handler
app.use('*', (_req: Request, res: Response) => {
  res.status(404).json({ error: 'Route not found' })
})

app.listen(PORT, () => {
  logger.info({ port: PORT }, 'Party List API server running')
})
