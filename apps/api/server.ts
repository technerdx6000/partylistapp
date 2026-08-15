import cors from "cors";
import express, { type NextFunction, type Request, type Response } from "express";
import helmet from "helmet";

import db from './config/database.js'
import logger, { configureLogger } from './logger.js'
import categoriesRoutes from './routes/categories.js'
import itemsRoutes from './routes/items.js'
import peopleRoutes from './routes/people.js'
import requiredItemsRoutes from './routes/required-items.js'
import { getEnv } from './src/config/env.js'

const env = getEnv()

configureLogger(env.LOG_LEVEL)

const app = express();
const PORT = env.PORT;

// Middleware
app.use(helmet());
app.use(
  cors({
    origin: env.CORS_ORIGIN,
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
      env.NODE_ENV === 'development'
        ? err.message
        : 'Internal Server Error',
  })
})

// 404 handler
app.use('*', (_req: Request, res: Response) => {
  res.status(404).json({ error: 'Route not found' })
})

if (env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    logger.info({ port: PORT }, 'Party List API server running')
  })
}

export { app }
