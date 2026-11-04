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
