import { PrismaClient } from '../generated/prisma/client'
import { isProduction } from './env'

// One client for the whole process; Prisma pools connections internally.
export const prisma = new PrismaClient({
  log: isProduction ? ['error'] : ['error', 'warn'],
})
