import { prisma } from '../../config/db.js'
import { AppError, forbidden, notFound } from '../../errors/app.errors.js'
import { mapPrismaKnownError } from '../../lib/prisma-errors.js'
import { emit } from '../../lib/events.js'
import { hashPassword, verifyPassword } from '../auth/auth.service.js'
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
    users: rows.map(({ _count, ...user }) => ({
      ...user,
      billCount: _count.bills,
      // The notes *about* this user — exactly what the cascade deletes.
      noteCount: _count.notesAbout,
    })),
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

/**
 * Deleting a user cascades: their bills are cancelled (stock returned, same
 * as a bill delete) and their notes removed. Bills they *issued* and notes
 * they *authored* are repointed to the deleting admin so client history
 * survives a departing employee. Destructive — therefore the caller must
 * confirm with their own password before anything runs.
 */
const TX_OPTIONS = { timeout: 60_000, maxWait: 15_000 } as const

export async function deleteUser(id: string, callerId: string, password: string) {
  if (id === callerId) throw forbidden()

  const [existing, caller] = await Promise.all([repo.findUserById(id), repo.findUserHash(callerId)])
  if (!existing) throw notFound('User')
  if (existing.role === 'ADMIN') {
    await assertOtherAdminExists(id)
  }
  if (!caller || !(await verifyPassword(password, caller.passwordHash))) {
    throw new AppError(
      403,
      'INVALID_PASSWORD',
      'Password confirmation failed — the user has not been deleted',
    )
  }

  // One atomic pass: restock + remove owned records, repoint authorship,
  // then delete the user (sessions/login history cascade via schema).
  await prisma.$transaction(async (tx) => {
    // 1. Owned bills → return every consumed unit to the shelf, then delete
    //    them (their items cascade by schema).
    const ownedBills = await tx.bill.findMany({
      where: { userId: id },
      select: { items: { select: { productId: true, quantity: true } } },
    })
    const restock = new Map<string, number>()
    for (const bill of ownedBills) {
      for (const item of bill.items) {
        restock.set(item.productId, (restock.get(item.productId) ?? 0) + item.quantity)
      }
    }
    for (const [productId, quantity] of restock) {
      await tx.product.update({
        where: { id: productId },
        data: { quantity: { increment: quantity } },
      })
    }
    await tx.bill.deleteMany({ where: { userId: id } })

    // 2. Issued bills / authored notes survive under the deleting admin.
    await tx.bill.updateMany({ where: { adminId: id }, data: { adminId: callerId } })
    await tx.note.updateMany({ where: { adminId: id }, data: { adminId: callerId } })

    // 3. Notes about this user and the account itself are gone for good.
    await tx.note.deleteMany({ where: { userId: id } })
    await tx.user.delete({ where: { id }, select: { id: true } })
  }, TX_OPTIONS)

  emit('user:changed', { userId: id, action: 'deleted' })
  return existing
}

async function assertOtherAdminExists(id: string) {
  const others = await repo.countAdminsExcluding(id)
  if (others === 0) {
    throw new AppError(409, 'LAST_ADMIN', 'At least one admin must remain')
  }
}
