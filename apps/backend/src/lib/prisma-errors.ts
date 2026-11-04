import { AppError, conflict, notFound } from '../errors/app.errors.js'

/** The parts of Prisma's known-request error we react to, duck-typed for safety. */
type KnownError = {
  code?: string
  meta?: { targets?: string[] | undefined } | undefined
}

/**
 * Maps Prisma runtime errors into AppErrors so controllers stay free of
 * storage details and the error middleware only sees AppError/Zod errors.
 */
export function mapPrismaKnownError(err: unknown, ctx: { entity: string }): Error {
  if (typeof err === 'object' && err !== null && 'code' in err) {
    const known = err as KnownError

    // Unique constraint: e.g. targets ['email'] → "That email is already taken".
    if (known.code === 'P2002') {
      const target = known.meta?.targets?.[0]
      return conflict(
        target ? `That ${target} is already taken` : `Duplicate value for the ${ctx.entity}`,
      )
    }
    // Record not found.
    if (known.code === 'P2025') {
      return notFound(ctx.entity)
    }
    // Foreign key violation: linked records (bills/notes) still reference it.
    if (known.code === 'P2003') {
      return new AppError(
        409,
        'LINKED_RECORDS_EXIST',
        `Cannot modify the ${ctx.entity} while linked records still exist`,
      )
    }
  }
  if (err instanceof AppError) return err
  return err instanceof Error ? err : new Error(String(err))
}
