import cors from "cors";
import express, { type Request, type Response } from "express";
import helmet from "helmet";

import db from './config/database.js'
import logger, { configureLogger } from './logger.js'
import { getEnv } from './src/config/env.js'
import { AppError } from './src/errors/AppError.js'
import { errorHandler } from './src/middleware/errorHandler.js'
import { generalRateLimit } from './src/middleware/rateLimits.js'
import { requestLogger } from './src/middleware/requestLogger.js'
import assignmentsRoutes from './src/routes/assignments.js'
import eventCategoriesRoutes from './src/routes/categories.js'
import eventsRoutes from './src/routes/events.js'
import eventItemsRoutes from './src/routes/items.js'
import participantsRoutes from './src/routes/participants.js'
import { asyncHandler } from './src/utils/asyncHandler.js'

const env = getEnv()

configureLogger(env.LOG_LEVEL)

const app = express();
const PORT = env.PORT;

app.set('trust proxy', 1)

// Middleware
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'none'"],
        baseUri: ["'none'"],
        formAction: ["'none'"],
        frameAncestors: ["'none'"],
      },
    },
  })
);
app.use(
  cors({
    origin: env.CORS_ORIGIN,
    credentials: true,
  })
);
app.use(requestLogger)
app.use(generalRateLimit)
app.use(express.json({ limit: '100kb' }));

// Routes
app.use('/api/events', eventsRoutes)
app.use('/api/assignments', assignmentsRoutes)
app.use('/api/participants', participantsRoutes)
app.use('/api/items', eventItemsRoutes)
app.use("/api/categories", eventCategoriesRoutes);

app.get('/api/health', asyncHandler(async (_req: Request, res: Response) => {
  try {
    await db.execute('SELECT 1')

    res.status(200).json({ status: 'ok', db: true })
  } catch {
    res.status(503).json({ status: 'degraded', db: false })
  }
}))

// 404 handler
app.use('*', (_req: Request, _res: Response, next) => {
  next(new AppError(404, 'ROUTE_NOT_FOUND', 'Route not found'))
})

app.use(errorHandler)

if (env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    logger.info({ port: PORT }, 'Party List API server running')
  })
}

export { app }
