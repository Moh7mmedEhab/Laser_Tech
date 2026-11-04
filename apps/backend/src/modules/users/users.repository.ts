import { prisma } from '../../config/db.js'
import { withRetry } from '../../lib/db-retry.js'
import { USER_PUBLIC_FIELDS } from './users.constants.js'
import type { CreateUserInput, ListUsersQuery, UpdateUserInput } from './users.validation.js'

export function listUsers(query: ListUsersQuery) {
  const { page, limit, role, search } = query
  const where = {
    ...(role ? { role } : {}),
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
      orderBy: { createdAt: 'desc' },
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
