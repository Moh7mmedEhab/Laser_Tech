import { forbidden, notFound } from '../../errors/app.errors.js'
import { mapPrismaKnownError } from '../../lib/prisma-errors.js'
import { emit } from '../../lib/events.js'
import type { Role } from '../auth/auth.types.js'
import * as repo from './notes.repository.js'
import type { NoteWith } from './notes.repository.js'
import type { CreateNoteInput, ListNotesQuery, UpdateNoteInput } from './notes.validation.js'

function serialize(note: NoteWith) {
  return { ...note, ...(note.amount !== null ? { amount: Number(note.amount) } : {}) }
}

export async function listNotes(query: ListNotesQuery, role: Role, callerId: string) {
  // USER accounts only see notes written about them.
  let effective: ListNotesQuery = query
  if (role === 'USER') {
    if (query.userId && query.userId !== callerId) throw forbidden()
    effective = { ...query, userId: callerId }
  }
  const [rows, total] = await repo.listNotes(effective)
  return { notes: rows.map(serialize), total }
}

export async function getNote(id: string, role: Role, callerId: string) {
  const note = await repo.findNoteById(id)
  if (!note) throw notFound('Note')
  if (role === 'USER' && note.userId !== callerId) throw forbidden()
  return serialize(note)
}

export async function createNote(input: CreateNoteInput, adminId: string) {
  try {
    const note = await repo.createNote({
      content: input.content,
      admin: { connect: { id: adminId } },
      ...(input.userId
        ? { user: { connect: { id: input.userId } } }
        : { user: undefined }),
      ...(input.amount !== undefined ? { amount: input.amount } : {}),
    })
    emit('note:created', { noteId: note.id, userId: input.userId ?? null })
    return serialize(note)
  } catch (err) {
    throw mapPrismaKnownError(err, { entity: 'note' })
  }
}

/**
 * Only admins and employees reach this route. Employees may manage just the
 * notes they wrote themselves; admins can edit/delete everything.
 */
function assertCanMutate(note: NoteWith, role: Role, callerId: string) {
  if (role !== 'ADMIN' && note.adminId !== callerId) throw forbidden()
}

export async function updateNote(id: string, input: UpdateNoteInput, role: Role, callerId: string) {
  const note = await repo.findNoteById(id)
  if (!note) throw notFound('Note')
  assertCanMutate(note, role, callerId)

  try {
    // undefined = leave the subject untouched; null = clear it; else re-link.
    const subject =
      input.userId === undefined ? {} : input.userId === null ? { userId: null } : { user: { connect: { id: input.userId } } }

    const updated = await repo.updateNote(id, {
      ...(input.content !== undefined ? { content: input.content } : {}),
      ...(input.amount !== undefined ? { amount: input.amount } : {}),
      ...subject,
    })
    emit('note:updated', { noteId: id })
    return serialize(updated)
  } catch (err) {
    throw mapPrismaKnownError(err, { entity: 'note' })
  }
}

export async function deleteNote(id: string, role: Role, callerId: string) {
  const note = await repo.findNoteById(id)
  if (!note) throw notFound('Note')
  assertCanMutate(note, role, callerId)

  await repo.deleteNote(id)
  emit('note:deleted', { noteId: id })
}
