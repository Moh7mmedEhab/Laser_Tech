export const USER_PUBLIC_FIELDS = {
  id: true,
  username: true,
  email: true,
  phone: true,
  role: true,
  createdAt: true,
  updatedAt: true,
} as const

export const ROLES = ['ADMIN', 'USER', 'EMPLOYEE'] as const
export type Role = (typeof ROLES)[number]
