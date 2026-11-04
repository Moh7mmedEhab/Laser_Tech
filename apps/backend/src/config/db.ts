import { PrismaClient } from '../generated/prisma/client.js'
import { PrismaPg } from '@prisma/adapter-pg'
import { env } from './env.js'

// One client for the whole process; the pg adapter owns the pool.
// Migrations use the direct URL through prisma.config.ts instead.
export const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: env.DATABASE_URL }),
})
