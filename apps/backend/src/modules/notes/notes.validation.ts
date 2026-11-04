import { z } from 'zod'
import { NOTE_CONTENT_MAX } from './notes.constants.js'

export const noteSubjectSchema = z.cuid().nullish()

export const createNoteSchema = z
  .object({
    userId: noteSubjectSchema,
    content: z.string().trim().min(1).max(NOTE_CONTENT_MAX),
    /** Optional EGP amount, e.g. money taken or a daily spend. */
    amount: z.number().min(0).max(9_999_999_999).optional(),
  })
  .strict()

export const updateNoteSchema = z
  .object({
    userId: noteSubjectSchema,
    content: z.string().trim().min(1).max(NOTE_CONTENT_MAX).optional(),
    amount: z
      .number()
      .min(0)
      .max(9_999_999_999)
      .nullish()
      .transform((v) => v ?? undefined),
  })
  .strict()
  .refine((n) => Object.keys(n).length > 0, { error: 'Provide at least one field' })

export const listNotesQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    userId: z.cuid().optional(),
    search: z.string().trim().min(1).max(60).optional(),
    minAmount: z.coerce.number().min(0).optional(),
    maxAmount: z.coerce.number().min(0).optional(),
    sort: z.enum(['newest', 'oldest', 'amount']).default('newest'),
  })
  .strict()

export const idParamSchema = z.object({ id: z.cuid() })

export type CreateNoteInput = z.infer<typeof createNoteSchema>
export type UpdateNoteInput = z.infer<typeof updateNoteSchema>
export type ListNotesQuery = z.infer<typeof listNotesQuerySchema>
