import 'dotenv/config'
import { startServer } from './lib/server.js'
import { prisma } from './config/db.js'

/**
 * Entry point; the only place that binds a port, so integration tests import
 * `createApp` and never touch this module.
 */
const { httpServer, io } = startServer()

async function shutdown(signal: NodeJS.Signals) {
  console.log(`Received ${signal}, shutting down gracefully...`)
  // Stop accepting new work first, then close idle DB connections.
  io.close()
  httpServer.close(() => {
    prisma.$disconnect().finally(() => process.exit(0))
  })
  // Hard exit if something hangs (in-flight Neon compute wake-up, etc).
  setTimeout(() => process.exit(1), 10_000).unref()
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
