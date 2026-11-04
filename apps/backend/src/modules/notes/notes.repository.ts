import type { Prisma } from '../../generated/prisma/client.js'
import { prisma } from '../../config/db.js'
import { withRetry } from '../../lib/db-retry.js'
import type { ListNotesQuery } from './notes.validation.js'

export const NOTE_INCLUDE = {
  admin: { select: { id: true, username: true } },
  user: { select: { id: true, username: true } },
} as const

export type NoteWith = Prisma.NoteGetPayload<{ include: typeof NOTE_INCLUDE }>

const SORTS: Record<ListNotesQuery['sort'], Prisma.NoteOrderByWithRelationInput> = {
  newest: { createdAt: 'desc' },
  oldest: { createdAt: 'asc' },
  amount: { amount: 'desc' },
}

export function listNotes(query: ListNotesQuery) {
  const { page, limit, userId, search, minAmount, maxAmount, sort } = query
  const where: Prisma.NoteWhereInput = {
    ...(userId ? { userId } : {}),
    ...(minAmount !== undefined || maxAmount !== undefined
      ? { amount: { gte: minAmount, lte: maxAmount } }
      : {}),
    ...(search
      ? {
          OR: [
            { content: { contains: search, mode: 'insensitive' } },
            { user: { username: { contains: search, mode: 'insensitive' } } },
          ],
        }
      : {}),
  }

  return prisma.$transaction([
    prisma.note.findMany({
      where,
      include: NOTE_INCLUDE,
      orderBy: SORTS[sort],
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.note.count({ where }),
  ])
}

export function findNoteById(id: string) {
  return withRetry(() => prisma.note.findUnique({ where: { id }, include: NOTE_INCLUDE }))
}

export function createNote(data: Prisma.NoteCreateInput) {
  return prisma.note.create({ data, include: NOTE_INCLUDE })
}

export function updateNote(id: string, data: Prisma.NoteUpdateInput) {
  return prisma.note.update({ where: { id }, data, include: NOTE_INCLUDE })
}

export function deleteNote(id: string) {
  return prisma.note.delete({ where: { id }, select: { id: true } })
}
