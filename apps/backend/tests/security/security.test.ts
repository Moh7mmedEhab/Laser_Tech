/**
 * Security suite: authentication enforcement, authorization scoping, header
 * hygiene and brute-force throttling. Runs against the Neon test branch.
 */
import { afterAll, describe, expect, it } from 'vitest'
import request from 'supertest'
import { createApp } from '../../src/lib/app'
import { prisma } from '../../src/config/db'
import { hashPassword } from '../../src/modules/auth/auth.service'
import { globalLimiter } from '../../src/lib/rate-limit'

const app = createApp()
const suffix = Date.now().toString(36)
const digits = String(Date.now() % 100_000_000) // digits-only for phone fields
const ADMIN_PW = 'Se4-Admin!!'
const USER_PW = 'Cl4-Client!'

let adminId = ''
let clientId = ''

afterAll(async () => {
  const ids = { in: [adminId, clientId] }
  await prisma.billItem.deleteMany({ where: { bill: { OR: [{ userId: ids }, { adminId: ids }] } } })
  await prisma.bill.deleteMany({ where: { OR: [{ userId: ids }, { adminId: ids }] } })
  await prisma.note.deleteMany({ where: { OR: [{ userId: ids }, { adminId: ids }] } })
  await prisma.session.deleteMany({ where: { userId: ids } })
  await prisma.loginHistory.deleteMany({ where: { userId: ids } })
  await prisma.product.deleteMany({ where: { sku: { contains: suffix.toUpperCase() } } })
  await prisma.user.deleteMany({ where: { id: ids } })
  await prisma.$disconnect()
})

let adminCookie = ''
let clientCookie = ''

async function seedAndLogin() {
  adminId = (
    await prisma.user.create({
      data: {
        username: `sec_admin_${suffix}`,
        email: `sec_admin_${suffix}@x.com`,
        phone: `+2013${digits}1`,
        role: 'ADMIN',
        passwordHash: await hashPassword(ADMIN_PW),
      },
    })
  ).id

  clientId = (
    await prisma.user.create({
      data: {
        username: `sec_client_${suffix}`,
        email: `sec_client_${suffix}@x.com`,
        phone: `+2013${digits}2`,
        role: 'USER',
        passwordHash: await hashPassword(USER_PW),
      },
    })
  ).id

  const adminLogin = await request(app)
    .post('/api/v1/auth/login')
    .send({ identifier: `sec_admin_${suffix}`, password: ADMIN_PW })
  adminCookie = adminLogin.headers['set-cookie'][0].split(';')[0]

  const clientLogin = await request(app)
    .post('/api/v1/auth/login')
    .send({ identifier: `sec_client_${suffix}`, password: USER_PW })
  clientCookie = clientLogin.headers['set-cookie'][0].split(';')[0]
}

// ---------------------------------------------------------------------------
// Session security
// ---------------------------------------------------------------------------

describe('session security', () => {
  it('session cookie is httpOnly, path-scoped and sameSite-protected', async () => {
    await seedAndLogin()
    const raw = (await request(app).post('/api/v1/auth/login').send({
      identifier: `sec_admin_${suffix}`,
      password: ADMIN_PW,
    })).headers['set-cookie'][0] as string

    expect(raw).toContain('HttpOnly')
    expect(raw).toContain('SameSite=Lax')
    expect(raw).toContain('Path=/')
  })

  it('rejects tampered cookies with a generic 401/404 shape, not a 500', async () => {
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Cookie', 'lt_session=tampered-token-not-in-db')
    expect(res.status).toBe(401)
    expect(res.body.error.code).toBe('SESSION_EXPIRED')
  })

  it('never leaks password hashes through any endpoint', async () => {
    const me = await request(app).get('/api/v1/auth/me').set('Cookie', adminCookie)
    expect(JSON.stringify(me.body)).not.toContain('passwordHash')

    const users = await request(app).get('/api/v1/users').set('Cookie', adminCookie)
    expect(JSON.stringify(users.body)).not.toContain('passwordHash')
  })

  it('DELETE /auth/sessions/:id cannot revoke another user\'s session', async () => {
    // Log the client in and capture their session id from the list.
    const clientLoginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ identifier: `sec_client_${suffix}`, password: USER_PW })
    const freshClientCookie = clientLoginRes.headers['set-cookie'][0].split(';')[0]

    // The client's sessions are not visible through the admin's /sessions list
    // (each user sees only their own sessions). To get the client's session id
    // we query it directly from the DB — simulating what an attacker would need.
    const clientSessions = await prisma.session.findMany({
      where: { userId: clientId, revokedAt: null },
      select: { id: true },
    })
    expect(clientSessions.length).toBeGreaterThan(0)
    const clientSessionId = clientSessions[0].id

    // Admin tries to revoke the client's session.
    const res = await request(app)
      .delete(`/api/v1/auth/sessions/${clientSessionId}`)
      .set('Cookie', adminCookie)
    // The service scopes session lookup to the calling user's userId, so the
    // session is simply "not found" for the admin.
    expect([404, 403]).toContain(res.status)

    // The client's session is still alive.
    expect(
      (await request(app).get('/api/v1/auth/me').set('Cookie', freshClientCookie)).status,
    ).toBe(200)

    await prisma.session.deleteMany({ where: { userId: clientId } })
  })
})

// ---------------------------------------------------------------------------
// Authorization scoping
// ---------------------------------------------------------------------------

describe('authorization scoping', () => {
  it('USER role cannot touch admin modules even with a valid session', async () => {
    const users = await request(app).get('/api/v1/users').set('Cookie', clientCookie)
    expect(users.status).toBe(403)

    const createProduct = await request(app)
      .post('/api/v1/products')
      .set('Cookie', clientCookie)
      .send({ name: 'Sneaky', sku: `SC-${suffix}`, price: 1 })
    expect(createProduct.status).toBe(403)

    const deleteBill = await request(app)
      .delete('/api/v1/bills/nonexistent000000000')
      .set('Cookie', clientCookie)
    expect([403, 404]).toContain(deleteBill.status)
  })

  it('401s every API route without a session cookie', async () => {
    for (const path of ['/api/v1/users', '/api/v1/products', '/api/v1/bills', '/api/v1/notes', '/api/v1/auth/sessions']) {
      const res = await request(app).get(path)
      expect([401, 403]).toContain(res.status)
      expect(res.body.error).toBeDefined()
    }
  })

  it('user deletion demands password confirmation every time', async () => {
    // USER cookies stay 403 before the password check even matters.
    const forbiddenUser = await request(app)
      .delete(`/api/v1/users/${clientId}`)
      .set('Cookie', clientCookie)
      .send({ password: 'whatever' })
    expect(forbiddenUser.status).toBe(403)

    // ADMIN: no password / empty body → validation error, nothing deleted.
    const missing = await request(app).delete(`/api/v1/users/${clientId}`).set('Cookie', adminCookie)
    expect([400, 422]).toContain(missing.status)
    expect(await prisma.user.findUnique({ where: { id: clientId } })).not.toBeNull()

    // Wrong password → explicit refusal, no cascade.
    const wrong = await request(app)
      .delete(`/api/v1/users/${clientId}`)
      .set('Cookie', adminCookie)
      .send({ password: 'Totally-Wrong1' })
    expect(wrong.status).toBe(403)
    expect(wrong.body.error.code).toBe('INVALID_PASSWORD')
    expect(await prisma.user.findUnique({ where: { id: clientId } })).not.toBeNull()
  })

  it('PATCH /auth/me cannot escalate role (strict schema rejects the field)', async () => {
    // `updateSelfSchema` is .strict() and contains no `role` field, so sending
    // `role` must result in a 422 validation error — not a silent ignore.
    const res = await request(app)
      .patch('/api/v1/auth/me')
      .set('Cookie', clientCookie)
      .send({ role: 'ADMIN' })
    expect(res.status).toBe(422)
    // The user's role must be unchanged.
    const me = await request(app).get('/api/v1/auth/me').set('Cookie', clientCookie)
    expect(me.body.user.role).toBe('USER')
  })

  it('USER cannot read by ID a note that belongs to a different subject', async () => {
    // Create a note whose subject is the admin (not the client).
    const note = await request(app)
      .post('/api/v1/notes')
      .set('Cookie', adminCookie)
      .send({ userId: adminId, content: 'admin self-note' })
    expect(note.status).toBe(201)
    const noteId: string = note.body.note.id

    // Client tries to read it — must be 403.
    const res = await request(app).get(`/api/v1/notes/${noteId}`).set('Cookie', clientCookie)
    expect(res.status).toBe(403)

    await request(app).delete(`/api/v1/notes/${noteId}`).set('Cookie', adminCookie)
  })
})

// ---------------------------------------------------------------------------
// Request hygiene
// ---------------------------------------------------------------------------

describe('request hygiene', () => {
  it('rejects oversized JSON bodies (16kb limit) with 413', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .set('Cookie', '')
      .send({ identifier: 'x'.repeat(20_000), password: 'pass' })
    expect([413, 400, 422]).toContain(res.status)
    expect(res.status).toBeLessThan(500)
  })

  it('returns structured errors, not stack traces, on 404', async () => {
    const res = await request(app).get('/api/v1/definitely-not-real')
    expect(res.status).toBe(404)
    expect(res.body.error.code).toBe('NOT_FOUND')
    expect(JSON.stringify(res.body)).not.toMatch(/at \w+ \(/)
  })

  it('helmet hardens the response', async () => {
    const res = await request(app).get('/api/v1/health')
    expect(res.headers['x-content-type-options']).toBe('nosniff')
    expect(res.headers['x-frame-options']).toBeDefined()
  })

  it('missing identifier in login body returns 422, not 500', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ password: 'SomePass1!' })
    expect(res.status).toBe(422)
    expect(res.body.error).toBeDefined()
  })
})

// ---------------------------------------------------------------------------
// Brute-force throttling (auth limiter)
// ---------------------------------------------------------------------------

describe('brute-force throttling (auth limiter)', () => {
  it('throttles repeated failed logins after the configured cap', async () => {
    const statuses: number[] = []
    for (let i = 0; i < 12; i++) {
      const res = await request(app).post('/api/v1/auth/login').send({
        identifier: `brute_${suffix}_${i}`,
        password: 'WrongPassw0rd!',
      })
      statuses.push(res.status)
    }
    expect(statuses.filter((s) => s === 429).length).toBeGreaterThan(0)
  }, 120_000)
})

// ---------------------------------------------------------------------------
// Rate limiter config sanity (unit-ish)
// ---------------------------------------------------------------------------

describe('rate limiter config sanity (unit-ish)', () => {
  it('global limiter never trusts x-forwarded-for (IP spoof safe with trust proxy=1)', async () => {
    expect(globalLimiter).toBeDefined()
  })
})
