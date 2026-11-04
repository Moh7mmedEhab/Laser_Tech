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

/** Self-service profile edits: no role/password fields here. */
export const updateSelfSchema = z
  .object({
    username: z.string().trim().min(3).max(32).regex(/^[a-zA-Z0-9_.-]+$/, 'Only letters, digits, dot, dash and underscore').optional(),
    email: z.email().trim().toLowerCase().max(120).optional(),
    phone: z.string().trim().min(7).max(20).regex(/^[0-9+\-\s()]+$/, 'Only digits and + - ( ) separators').optional(),
  })
  .strict()
  .refine((u) => Object.values(u).some((v) => v !== undefined), {
    error: 'Provide at least one field',
  })

export const revokeSessionSchema = z
  .object({
    id: z.cuid(),
  })
  .strict()

export type LoginInput = z.infer<typeof loginSchema>
