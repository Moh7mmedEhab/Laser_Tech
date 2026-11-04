import { PrismaClient } from '../generated/prisma/client.js'
import { PrismaPg } from '@prisma/adapter-pg'
import { env } from './env.js'

/**
 * One client for the whole process; the pg adapter owns the pool.
 *
 * Pool sizing notes (Neon):
 * - `idleTimeoutMillis` sits below Neon's 5-minute idle compute suspend, so the
 *   pool cycles its own sockets before the server kills them mid-flight.
 * - `connectionTimeoutMillis` covers the seconds a cold compute needs to wake.
 * Migrations use DIRECT_URL via prisma.config.ts instead.
 */
export const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: env.DATABASE_URL,
    max: env.NODE_ENV === 'production' ? 10 : 5,
    idleTimeoutMillis: 240_000,
    connectionTimeoutMillis: 30_000,
  }),
})
