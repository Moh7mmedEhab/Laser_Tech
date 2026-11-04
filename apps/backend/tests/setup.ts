import { fileURLToPath } from 'node:url'
import { config } from 'dotenv'

/**
 * Points the whole test run at the Neon BACKEND-TEST branch. Loaded before
 * any app module, so config/env validation sees the right DATABASE_URL.
 * Never run integration/security suites against the production branch.
 */
// fileURLToPath because the workspace path contains a space ("Laser Tech").
config({ path: fileURLToPath(new URL('../.env.test', import.meta.url)), override: true })
process.env.NODE_ENV = 'test'

if (!process.env.DATABASE_URL?.includes('pooler')) {
  throw new Error('Refusing to run tests: DATABASE_URL does not look like a pooled test-branch URL')
}
