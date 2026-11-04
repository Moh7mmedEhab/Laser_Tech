import 'dotenv/config'
import { prisma } from '../src/config/db.js'
import { hashPassword } from '../src/modules/auth/auth.service.js'
import { ROLES } from '../src/modules/users/users.constants.js'

/**
 * Seeds or resets the FIRST ADMIN account. Idempotent: re-running with the
 * same identifier updates username/email/phone/password/role of that user.
 *
 *   npm run dev -w apps/backend          # normal server
 *   npm run seed -w apps/backend -- --username admin --email admin@lasertech.com --phone +201000000000 --password 'Str0ngPass!'
 */
function arg(name: string, fallback?: string): string {
  const i = process.argv.indexOf(name)
  const value = i !== -1 ? process.argv[i + 1] : undefined
  if (!value && !fallback) {
    console.error(`Missing required arg ${name}`)
    process.exit(1)
  }
  return value ?? fallback!
}

async function main() {
  const username = arg('--username', 'admin')
  const email = arg('--email', 'admin@lasertech.com').toLowerCase()
  const phone = arg('--phone', '+201000000000')
  const password = arg('--password')
  const role = arg('--role', 'ADMIN')

  if (!ROLES.includes(role as (typeof ROLES)[number])) {
    throw new Error(`Invalid role ${role}; expected one of ${ROLES.join(', ')}`)
  }
  if (password.length < 8) throw new Error('Password must be at least 8 characters')

  const passwordHash = await hashPassword(password)
  const roleValue = role as (typeof ROLES)[number]

  const user = await prisma.user.upsert({
    where: { username },
    create: { username, email, phone, passwordHash, role: roleValue },
    update: { email, phone, passwordHash, role: roleValue },
    select: { id: true, username: true, email: true, phone: true, role: true },
  })

  console.log('Seeded user:', JSON.stringify(user))
}

main()
  .catch((err) => {
    console.error('Seed failed:', err)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
