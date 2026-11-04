import type { Prisma } from '../../generated/prisma/client.js'
import { prisma } from '../../config/db.js'
import { withRetry } from '../../lib/db-retry.js'
import { USER_PUBLIC_FIELDS } from './users.constants.js'
import type { CreateUserInput, ListUsersQuery, UpdateUserInput } from './users.validation.js'

const SORT_FIELDS: Record<ListUsersQuery['sort'], string> = {
  newest: 'createdAt',
  username: 'username',
  role: 'role',
}

const SORTS: Record<ListUsersQuery['sort'], Prisma.UserOrderByWithRelationInput> = {
  newest: { createdAt: 'desc' },
  username: { username: 'asc' },
  role: { role: 'asc' },
}

export function listUsers(query: ListUsersQuery) {
  const { page, limit, role, search, from, to, sort, order } = query
  const where: Prisma.UserWhereInput = {
    ...(role ? { role } : {}),
    ...(from || to
      ? { createdAt: { gte: from ? new Date(`${from}T00:00:00.000Z`) : undefined, lte: to ? new Date(`${to}T23:59:59.999Z`) : undefined } }
      : {}),
    ...(search
      ? {
          OR: [
            { username: { contains: search, mode: 'insensitive' as const } },
            { email: { contains: search, mode: 'insensitive' as const } },
            { phone: { contains: search } },
          ],
        }
      : {}),
  }

  return prisma.$transaction([
    prisma.user.findMany({
      where,
      select: { ...USER_PUBLIC_FIELDS, _count: { select: { bills: true } } },
      // Explicit client order wins; otherwise the column's server default.
      orderBy: order ? { [SORT_FIELDS[sort]]: order } : SORTS[sort],
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.user.count({ where }),
  ])
}

export function findUserById(id: string) {
  return withRetry(() =>
    prisma.user.findUnique({
      where: { id },
      select: { ...USER_PUBLIC_FIELDS, passwordHash: true },
    }),
  )
}

export function countAdminsExcluding(userId: string) {
  return prisma.user.count({ where: { role: 'ADMIN', id: { not: userId } } })
}

export function createUser(data: Omit<CreateUserInput, 'password'> & { passwordHash: string }) {
  return prisma.user.create({ data, select: USER_PUBLIC_FIELDS })
}

export function updateUser(id: string, data: UpdateUserInput & { passwordHash?: string }) {
  return prisma.user.update({ where: { id }, data, select: USER_PUBLIC_FIELDS })
}

export function deleteUser(id: string) {
  return prisma.user.delete({ where: { id }, select: USER_PUBLIC_FIELDS })
}
