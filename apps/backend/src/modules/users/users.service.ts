import { prisma } from '../../config/db.js'
import { AppError, forbidden, notFound } from '../../errors/app.errors.js'
import { mapPrismaKnownError } from '../../lib/prisma-errors.js'
import { emit } from '../../lib/events.js'
import { hashPassword } from '../auth/auth.service.js'
import * as repo from './users.repository.js'
import type { CreateUserInput, ListUsersQuery, UpdateUserInput } from './users.validation.js'

type WithHash = { passwordHash: string | null }

function stripHash<T extends WithHash>(user: T): Omit<T, 'passwordHash'> {
  const { passwordHash: _ignored, ...rest } = user
  return rest
}

export async function listUsers(query: ListUsersQuery) {
  const [rows, total] = await repo.listUsers(query)
  return {
    users: rows.map(({ _count, ...user }) => ({ ...user, billCount: _count.bills })),
    total,
  }
}

export async function getUser(id: string) {
  const user = await repo.findUserById(id)
  if (!user) throw notFound('User')
  return stripHash(user)
}

export async function createUser(input: CreateUserInput) {
  try {
    const passwordHash = await hashPassword(input.password)
    const { password: _password, ...rest } = input
    const created = await repo.createUser({ ...rest, passwordHash })
    emit('user:changed', { userId: created.id, action: 'created' })
    return created
  } catch (err) {
    throw mapPrismaKnownError(err, { entity: 'user' })
  }
}

export async function updateUser(id: string, input: UpdateUserInput) {
  const existing = await repo.findUserById(id)
  if (!existing) throw notFound('User')

  // An admin downgrade is only allowed while another admin remains.
  if (existing.role === 'ADMIN' && input.role && input.role !== 'ADMIN') {
    await assertOtherAdminExists(id)
  }

  try {
    const { password, ...rest } = input
    const data: typeof rest & { passwordHash?: string } = { ...rest }
    if (password) data.passwordHash = await hashPassword(password)

    const updated = await repo.updateUser(id, data)
    emit('user:changed', { userId: id, action: 'updated' })
    return updated
  } catch (err) {
    throw mapPrismaKnownError(err, { entity: 'user' })
  }
}

export async function deleteUser(id: string, callerId: string) {
  if (id === callerId) throw forbidden()

  const existing = await repo.findUserById(id)
  if (!existing) throw notFound('User')
  if (existing.role === 'ADMIN') {
    await assertOtherAdminExists(id)
  }

  // Sessions and login history cascade; bills and notes do not.
  const blocks = await prisma.$transaction([
    prisma.bill.count({ where: { OR: [{ userId: id }, { adminId: id }] } }),
    prisma.note.count({ where: { OR: [{ adminId: id }, { userId: id }] } }),
  ])
  const [bills, notes] = blocks
  if (bills > 0 || notes > 0) {
    throw new AppError(
      409,
      'USER_HAS_REFERENCES',
      `Cannot delete a user with linked records (${bills} bills, ${notes} notes)`,
    )
  }

  const deleted = await repo.deleteUser(id)
  emit('user:changed', { userId: id, action: 'deleted' })
  return deleted
}

async function assertOtherAdminExists(id: string) {
  const others = await repo.countAdminsExcluding(id)
  if (others === 0) {
    throw new AppError(409, 'LAST_ADMIN', 'At least one admin must remain')
  }
}
