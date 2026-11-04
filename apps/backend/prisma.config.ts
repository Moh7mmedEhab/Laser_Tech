import path from 'node:path'
import { defineConfig, env } from 'prisma/config'
import 'dotenv/config'

export default defineConfig({
  schema: path.join('prisma', 'schema.prisma'),
  // CLI commands (migrate/reset) always use the direct connection.
  datasource: {
    url: process.env.DIRECT_URL ?? env('DATABASE_URL'),
  },
  migrations: {
    path: path.join('prisma', 'migrations'),
  },
})
