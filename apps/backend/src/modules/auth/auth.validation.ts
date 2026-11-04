import { z } from 'zod'
import { AppError } from '../../errors/app.errors.js'

/** Login accepts username OR email as the identifier. */
export const loginSchema = z
  .object({
    identifier: z.string().trim().min(3).max(120),
    password: z.string().min(8).max(128),
  })
  .strict()

export const revokeSessionSchema = z
  .object({
    id: z.cuid(),
  })
  .strict()

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1).max(128),
    newPassword: z
      .string()
      .min(8)
      .max(128)
      .regex(/[a-z]/, 'Must contain a lowercase letter')
      .regex(/[A-Z]/, 'Must contain an uppercase letter')
      .regex(/[0-9]/, 'Must contain a digit'),
  })
  .strict()

export type LoginInput = z.infer<typeof loginSchema>

export function parseLogin(body: unknown) {
  const result = loginSchema.safeParse(body)
  if (!result.success) {
    throw new AppError(422, 'VALIDATION_ERROR', 'Invalid login payload')
  }
  return result.data
}

/** Reuse a constant dummy hash so unknown identifiers take the same time. */
export const DUMMY_BCRYPT_HASH = '$2b$10$CwTycUXWue0Thq9StjUM0uJ8.PUr.lq0QupmTPn0ab0N1tLCgpMGW'
