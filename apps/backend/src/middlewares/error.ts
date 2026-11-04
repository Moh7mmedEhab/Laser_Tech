import type { NextFunction, Request, Response } from 'express'
import { ZodError } from 'zod'
import { AppError } from '../errors/app.errors.js'
import { isProduction } from '../config/env.js'

type KnownError = { status?: number; code?: string }

export function errorHandler(err: unknown, _req: Request, res: Response, next: NextFunction) {
  if (res.headersSent) return next(err)

  if (err instanceof ZodError) {
    return res.status(422).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request data',
        details: zodIssues(err),
      },
    })
  }

  if (err instanceof AppError) {
    return res.status(err.status).json({ error: { code: err.code, message: err.message } })
  }

  if (typeof err === 'object' && err !== null && 'status' in err && 'code' in err) {
    const known = err as KnownError
    if (typeof known.status === 'number' && known.status >= 400 && known.status < 500) {
      return res.status(known.status).json({ error: { code: known.code, message: String(err) } })
    }
  }

  // body-parser size guard: the entity got past express.json's 'limit' option.
  const parser = err as { type?: string; statusCode?: number; expose?: boolean }
  if (parser.type === 'entity.too.large') {
    return res.status(413).json({
      error: { code: 'PAYLOAD_TOO_LARGE', message: 'Request body too large' },
    })
  }
  if (typeof parser.statusCode === 'number' && parser.statusCode >= 400 && parser.statusCode < 500 && parser.expose) {
    const message = (err as { message?: unknown } | null) ?? null
    return res.status(parser.statusCode).json({
      error: { code: 'BAD_REQUEST', message: message && typeof message === 'object' && 'message' in message ? String(message.message) : 'Bad request' },
    })
  }

  console.error('Unhandled error:', err)
  // Never leak internals in production responses.
  return res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: isProduction ? 'Something went wrong' : String(err),
    },
  })
}

function zodIssues(err: ZodError) {
  return err.issues.map((i) => ({
    path: i.path.join('.'),
    message: i.message,
  }))
}
