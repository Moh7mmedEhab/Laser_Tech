import { z } from 'zod'
import { passwordSchema } from '../../lib/validation/password.js'

/** Login accepts username OR email as the identifier. */
export const loginSchema = z
  .object({
    identifier: z.string().trim().min(3).max(120),
    password: z.string().min(1).max(128),
  })
  .strict()

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1).max(128),
    newPassword: passwordSchema,
  })
  .strict()

export const revokeSessionSchema = z
  .object({
    id: z.cuid(),
  })
  .strict()

export type LoginInput = z.infer<typeof loginSchema>
