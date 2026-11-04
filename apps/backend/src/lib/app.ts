import express, { type Express } from 'express'
import helmet from 'helmet'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import { env } from '../config/env'
import { globalLimiter } from './rate-limit'
import { errorHandler } from '../middlewares/error'

/** Builds the fully wired Express app without starting a server (testable). */
export function createApp(): Express {
  const app = express()

  app.disable('x-powered-by')
  app.use(helmet())
  app.use(
    cors({
      origin: env.CORS_ORIGINS,
      credentials: true,
    }),
  )
  app.use(express.json({ limit: '16kb' }))
  app.use(cookieParser(env.COOKIE_SECRET))
  app.use(globalLimiter)

  app.get('/api/v1/health', (_req, res) => {
    res.json({ ok: true })
  })

  app.use((_req, res) => {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Route not found' } })
  })
  app.use(errorHandler)

  return app
}
