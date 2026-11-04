import { z } from 'zod'
import { passwordSchema } from '../../lib/validation/password.js'
import { ROLES } from './users.constants.js'

const usernameSchema = z
  .string()
  .trim()
  .min(3)
  .max(32)
  .regex(/^[a-zA-Z0-9_.-]+$/, 'Only letters, digits, dot, dash and underscore')

const emailSchema = z.email().trim().toLowerCase().max(120)

const phoneSchema = z
  .string()
  .trim()
  .min(7)
  .max(20)
  .regex(/^[0-9+\-\s()]+$/, 'Only digits and + - ( ) separators')

export const createUserSchema = z
  .object({
    username: usernameSchema,
    email: emailSchema,
    phone: phoneSchema,
    password: passwordSchema,
    role: z.enum(ROLES).default('USER'),
  })
  .strict()

export const updateUserSchema = z
  .object({
    username: usernameSchema.optional(),
    email: emailSchema.optional(),
    phone: phoneSchema.optional(),
    password: passwordSchema.optional(),
    role: z.enum(ROLES).optional(),
  })
  .strict()
  .refine((u) => Object.values(u).some((v) => v !== undefined), {
    error: 'Provide at least one field',
  })

export const listUsersQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    role: z.enum(ROLES).optional(),
    search: z.string().trim().min(1).max(60).optional(),
  })
  .strict()

export const idParamSchema = z.object({ id: z.cuid() })

export type CreateUserInput = z.infer<typeof createUserSchema>
export type UpdateUserInput = z.infer<typeof updateUserSchema>
export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>
