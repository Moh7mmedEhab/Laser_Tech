import { beforeAll, afterAll, describe, expect, it } from 'vitest'
import request from 'supertest'
import { createApp } from '../../src/lib/app'
import { prisma } from '../../src/config/db'
import { hashPassword } from '../../src/modules/auth/auth.service'

const app = createApp()

const ADMIN_PW = 'Te5t-Admin!'
const USER_PW = 'Te5t-Client!'
const EMP_PW = 'Te5t-Emp!'
const suffix = Date.now().toString(36)
const digits = String(Date.now() % 100_000_000) // digits-only for phone fields

let adminId = ''
let clientId = ''
let employeeId = ''

async function login(identifier: string, password: string) {
  return request(app)
    .post('/api/v1/auth/login')
    .send({ identifier, password })
}

const cookieOf = (res: request.Response) => res.headers['set-cookie'][0].split(';')[0]

beforeAll(async () => {
  // Known-password fixtures, fresh suffix so reruns never collide.
  for (const spec of [
    { username: `t_admin_${suffix}`, email: `t_admin_${suffix}@x.com`, phone: `+2012${digits}1`, password: ADMIN_PW, role: 'ADMIN' as const },
    { username: `t_client_${suffix}`, email: `t_client_${suffix}@x.com`, phone: `+2012${digits}2`, password: USER_PW, role: 'USER' as const },
    { username: `t_emp_${suffix}`, email: `t_emp_${suffix}@x.com`, phone: `+2012${digits}3`, password: EMP_PW, role: 'EMPLOYEE' as const },
  ]) {
    const { password, passwordHash, ...rest } = { passwordHash: await hashPassword(spec.password), ...spec }
    const created = await prisma.user.create({
      data: {
        username: rest.username,
        email: rest.email,
        phone: rest.phone,
        role: rest.role,
        passwordHash,
      },
    })
    void password
    if (spec.role === 'ADMIN') adminId = created.id
    else if (spec.role === 'USER') clientId = created.id
    else employeeId = created.id
  }
})

afterAll(async () => {
  // Every fixture (admin/client/employee/extra/cascade/victim…) shares the
  // run suffix — a failed run can otherwise leave admin strays that break
  // the next run's last-admin guard.
  const strays = await prisma.user.findMany({
    where: { username: { contains: `_${suffix}` } },
    select: { id: true },
  })
  const ids = { in: strays.map((u) => u.id) }
  await prisma.billItem.deleteMany({ where: { bill: { OR: [{ userId: ids }, { adminId: ids }] } } })
  await prisma.bill.deleteMany({ where: { OR: [{ userId: ids }, { adminId: ids }] } })
  await prisma.note.deleteMany({ where: { OR: [{ userId: ids }, { adminId: ids }] } })
  await prisma.session.deleteMany({ where: { userId: ids } })
  await prisma.loginHistory.deleteMany({ where: { userId: ids } })
  // Products from this batch are keyed by the unique SKU suffix.
  await prisma.product.deleteMany({ where: { sku: { contains: suffix.toUpperCase() } } })
  await prisma.user.deleteMany({ where: { username: { contains: `_${suffix}` } } })
  await prisma.$disconnect()
})

// ---------------------------------------------------------------------------
// Auth lifecycle
// ---------------------------------------------------------------------------

describe('auth lifecycle', () => {
  it('rejects wrong credentials and unknown users identically (user-enum defense)', async () => {
    const wrongPw = await login(`t_admin_${suffix}`, 'Absolutely-Wrong1')
    const unknown = await login(`ghost_${suffix}`, 'Absolutely-Wrong1')
    expect(wrongPw.status).toBe(401)
    expect(unknown.status).toBe(401)
    expect(wrongPw.body.error).toEqual(unknown.body.error)
  })

  it('logs in with username or email and sets an httpOnly cookie', async () => {
    const res = await login(`t_admin_${suffix}`, ADMIN_PW)
    expect(res.status).toBe(201)
    expect(res.headers['set-cookie'][0]).toContain('HttpOnly')
    const byEmail = await login(`t_client_${suffix}@x.com`, USER_PW)
    expect(byEmail.status).toBe(201)
  })

  it('exposes /me for a valid session and 401 without cookie', async () => {
    expect((await request(app).get('/api/v1/auth/me')).status).toBe(401)
    const res = await login(`t_admin_${suffix}`, ADMIN_PW)
    const me = await request(app).get('/api/v1/auth/me').set('Cookie', cookieOf(res))
    expect(me.status).toBe(200)
    expect(me.body.user.username).toBe(`t_admin_${suffix}`)
    expect('passwordHash' in me.body.user).toBe(false)
  })

  it('PATCH /auth/me updates self profile fields', async () => {
    const res = await login(`t_admin_${suffix}`, ADMIN_PW)
    const cookie = cookieOf(res)

    const patch = await request(app)
      .patch('/api/v1/auth/me')
      .set('Cookie', cookie)
      .send({ phone: '+201099887766' })
    expect(patch.status).toBe(200)
    expect(patch.body.user.phone).toBe('+201099887766')
    expect('passwordHash' in patch.body.user).toBe(false)

    // Restore the original phone so other tests are unaffected.
    await request(app)
      .patch('/api/v1/auth/me')
      .set('Cookie', cookie)
      .send({ phone: `+2012${digits}1` })
  })

  it('lists sessions, revokes all others, and validates wrong password change', async () => {
    const res1 = await login(`t_admin_${suffix}`, ADMIN_PW)
    await login(`t_client_${suffix}`, USER_PW)

    const list = await request(app)
      .get('/api/v1/auth/sessions')
      .set('Cookie', cookieOf(res1))
    // This admin's own sessions only; two fresh logins for admin → 2? Only res1 is admin others were client.
    expect(list.status).toBe(200)
    expect(list.body.sessions.every((s: object) => 'current' in s)).toBe(true)

    const revoked = await request(app)
      .delete('/api/v1/auth/sessions')
      .set('Cookie', cookieOf(res1))
    expect(revoked.status).toBe(200)

    const history = await request(app)
      .get('/api/v1/auth/login-history')
      .set('Cookie', cookieOf(res1))
    expect(history.status).toBe(200)
    expect(history.body.history.length).toBeGreaterThan(0)

    const change = await request(app)
      .patch('/api/v1/auth/password')
      .set('Cookie', cookieOf(res1))
      .send({ currentPassword: 'wrong-current', newPassword: 'Ne9-Passw0rd!' })
    expect(change.status).toBe(401) // wrong current password

    await prisma.session.deleteMany({ where: { user: { username: `t_admin_${suffix}` } } })
  })

  it('revokes a single named session via DELETE /auth/sessions/:id', async () => {
    const resA = await login(`t_admin_${suffix}`, ADMIN_PW)
    const cookieA = cookieOf(resA)
    const resB = await login(`t_admin_${suffix}`, ADMIN_PW)
    const cookieB = cookieOf(resB)

    // List sessions from A's perspective; find B's session id.
    const list = await request(app).get('/api/v1/auth/sessions').set('Cookie', cookieA)
    expect(list.status).toBe(200)
    const sessions: Array<{ id: string; current: boolean }> = list.body.sessions
    const otherSession = sessions.find((s) => !s.current)
    expect(otherSession).toBeDefined()

    // Revoke B's session while authenticated as A.
    const revoke = await request(app)
      .delete(`/api/v1/auth/sessions/${otherSession!.id}`)
      .set('Cookie', cookieA)
    expect(revoke.status).toBe(200)

    // B's cookie should now be dead.
    expect((await request(app).get('/api/v1/auth/me').set('Cookie', cookieB)).status).toBe(401)

    // A's session is still alive.
    expect((await request(app).get('/api/v1/auth/me').set('Cookie', cookieA)).status).toBe(200)

    await prisma.session.deleteMany({ where: { user: { username: `t_admin_${suffix}` } } })
  })

  it('PATCH /auth/password succeeds with correct current password and invalidates other sessions', async () => {
    const res1 = await login(`t_admin_${suffix}`, ADMIN_PW)
    const cookie1 = cookieOf(res1)
    const res2 = await login(`t_admin_${suffix}`, ADMIN_PW)
    const cookie2 = cookieOf(res2)

    const change = await request(app)
      .patch('/api/v1/auth/password')
      .set('Cookie', cookie1)
      .send({ currentPassword: ADMIN_PW, newPassword: 'Ne9-Changed!' })
    expect(change.status).toBe(200)
    expect(change.body.ok).toBe(true)

    // Other session (cookie2) is now revoked.
    expect((await request(app).get('/api/v1/auth/me').set('Cookie', cookie2)).status).toBe(401)

    // Current session (cookie1) stays alive.
    expect((await request(app).get('/api/v1/auth/me').set('Cookie', cookie1)).status).toBe(200)

    // Rotate back to the original password so the other tests continue working.
    await request(app)
      .patch('/api/v1/auth/password')
      .set('Cookie', cookie1)
      .send({ currentPassword: 'Ne9-Changed!', newPassword: ADMIN_PW })

    await prisma.session.deleteMany({ where: { user: { username: `t_admin_${suffix}` } } })
  })

  it('logs out and the cookie stops working immediately', async () => {
    const res = await login(`t_admin_${suffix}`, ADMIN_PW)
    const cookie = cookieOf(res)
    expect((await request(app).post('/api/v1/auth/logout').set('Cookie', cookie)).status).toBe(200)
    expect((await request(app).get('/api/v1/auth/me').set('Cookie', cookie)).status).toBe(401)
  })
})

// ---------------------------------------------------------------------------
// Users module (admin-only)
// ---------------------------------------------------------------------------

describe('users module (admin-only)', () => {
  it('blocks users/employees from listing or creating', async () => {
    const client = await login(`t_client_${suffix}`, USER_PW)
    const clientCookie = cookieOf(client)

    expect((await request(app).get('/api/v1/users').set('Cookie', clientCookie)).status).toBe(403)
    expect(
      (
        await request(app)
          .post('/api/v1/users')
          .set('Cookie', clientCookie)
          .send({ username: 'nope', email: 'nope@x.com', phone: '+201234567891', password: 'Ne9-Passw0rd!' })
      ).status,
    ).toBe(403)
  })

  it('creates, lists, updates and tolerates duplicate emails (409)', async () => {
    const admin = cookieOf(await login(`t_admin_${suffix}`, ADMIN_PW))

    const create = await request(app)
      .post('/api/v1/users')
      .set('Cookie', admin)
      .send({ username: `t_extra_${suffix}`, email: `t_extra_${suffix}@x.com`, phone: `+2012${digits}4`, password: 'Te5t-Extra!' })
    expect(create.status).toBe(201)

    const list = await request(app)
      .get(`/api/v1/users?search=t_extra_${suffix}`)
      .set('Cookie', admin)
    expect(list.body.total).toBe(1)

    const dupe = await request(app)
      .post('/api/v1/users')
      .set('Cookie', admin)
      .send({ username: `t_other_${suffix}`, email: `t_extra_${suffix}@x.com`, phone: `+2012${digits}5`, password: 'Te5t-Other!' })
    expect(dupe.status).toBe(409)
    expect(dupe.body.error.code).toBe('CONFLICT')

    const patch = await request(app)
      .patch(`/api/v1/users/${create.body.user.id}`)
      .set('Cookie', admin)
      .send({ role: 'EMPLOYEE' })
    expect(patch.status).toBe(200)
    expect(patch.body.user.role).toBe('EMPLOYEE')

    // GET /users/:id returns the individual user record.
    const single = await request(app)
      .get(`/api/v1/users/${create.body.user.id}`)
      .set('Cookie', admin)
    expect(single.status).toBe(200)
    expect(single.body.user.id).toBe(create.body.user.id)
    expect('passwordHash' in single.body.user).toBe(false)

    await request(app)
      .delete(`/api/v1/users/${create.body.user.id}`)
      .set('Cookie', admin)
      .send({ password: ADMIN_PW })
    expect((await request(app).get(`/api/v1/users?search=t_extra_${suffix}`).set('Cookie', admin)).body.total).toBe(0)
  })

  it('refuses to delete or demote the last admin', async () => {
    const admin = cookieOf(await login(`t_admin_${suffix}`, ADMIN_PW))
    const patch = await request(app)
      .patch(`/api/v1/users/${adminId}`)
      .set('Cookie', admin)
      .send({ role: 'USER' })
    expect(patch.status).toBe(409)
    expect(patch.body.error.code).toBe('LAST_ADMIN')

    const remove = await request(app)
      .delete(`/api/v1/users/${adminId}`)
      .set('Cookie', admin)
      .send({ password: ADMIN_PW })
    // Self-delete is forbidden, even with the right password.
    expect(remove.status).toBe(403)
    expect(remove.body.error.code).toBe('SELF_DELETE')
  })

  it('password-confirmed delete cascades owned records, restocks, and repoints issued work', async () => {
    const admin = cookieOf(await login(`t_admin_${suffix}`, ADMIN_PW))

    // Fresh client + product; a second admin will issue the records.
    const victim = await request(app)
      .post('/api/v1/users')
      .set('Cookie', admin)
      .send({ username: `t_casc_${suffix}`, email: `t_casc_${suffix}@x.com`, phone: `+2012${digits}7`, password: 'Te5t-Casc!' })
    expect(victim.status).toBe(201)
    const victimId = victim.body.user.id

    const admin2 = await request(app)
      .post('/api/v1/users')
      .set('Cookie', admin)
      .send({ username: `t_adm2_${suffix}`, email: `t_adm2_${suffix}@x.com`, phone: `+2012${digits}8`, password: 'Te5t-Adm2!', role: 'ADMIN' })
    expect(admin2.status).toBe(201)
    const admin2Id = admin2.body.user.id
    const admin2Cookie = cookieOf(await login(`t_adm2_${suffix}`, 'Te5t-Adm2!'))

    const create = await request(app)
      .post('/api/v1/products')
      .set('Cookie', admin)
      .send({ name: 'Cascade Probe', sku: `CP-${suffix.toUpperCase()}`, price: 5, quantity: 10 })
    const productId = create.body.product.id

    // Victim-owned bill (3 units) + a surviving client's bill (2 units).
    const victimBill = await request(app)
      .post('/api/v1/bills')
      .set('Cookie', admin2Cookie)
      .send({ userId: victimId, items: [{ productId, quantity: 3 }] })
    const clientBill = await request(app)
      .post('/api/v1/bills')
      .set('Cookie', admin2Cookie)
      .send({ userId: clientId, items: [{ productId, quantity: 2 }] })
    expect(victimBill.status).toBe(201)
    expect(clientBill.status).toBe(201)
    // 10 - 3 - 2 = 5 on the shelf.
    expect((await prisma.product.findUniqueOrThrow({ where: { id: productId } })).quantity).toBe(5)

    // Authored note → survives as the other admin's; subject note → deleted.
    const authoredNote = await request(app)
      .post('/api/v1/notes')
      .set('Cookie', admin2Cookie)
      .send({ userId: clientId, content: 'about the client' })
    const subjectNote = await request(app)
      .post('/api/v1/notes')
      .set('Cookie', admin2Cookie)
      .send({ userId: victimId, content: 'about the victim' })
    expect(authoredNote.status).toBe(201)
    expect(subjectNote.status).toBe(201)

    // Wrong password → INVALID_PASSWORD and nothing changed at all.
    const wrong = await request(app)
      .delete(`/api/v1/users/${victimId}`)
      .set('Cookie', admin)
      .send({ password: 'No9-Wrong-Pw!' })
    expect(wrong.status).toBe(403)
    expect(wrong.body.error.code).toBe('INVALID_PASSWORD')
    expect(await prisma.user.findUnique({ where: { id: victimId } })).not.toBeNull()
    expect((await prisma.product.findUniqueOrThrow({ where: { id: productId } })).quantity).toBe(5)

    // Correct password → atomic cascade.
    const done = await request(app)
      .delete(`/api/v1/users/${victimId}`)
      .set('Cookie', admin)
      .send({ password: ADMIN_PW })
    expect(done.status).toBe(204)
    expect(await prisma.user.findUnique({ where: { id: victimId } })).toBeNull()
    // Victim's bill cancelled → its 3 units back on the shelf (10 - 3 - 2 + 3 = 8)
    expect((await prisma.product.findUniqueOrThrow({ where: { id: productId } })).quantity).toBe(8)
    expect(await prisma.bill.findUnique({ where: { id: victimBill.body.bill.id } })).toBeNull()
    expect(await prisma.note.findUnique({ where: { id: subjectNote.body.note.id } })).toBeNull()

    // The client's bill and note survive — still owned by the issuing admin2
    // for now (repointing happens when *admin2* is deleted).
    const survivingBill = await prisma.bill.findUnique({
      where: { id: clientBill.body.bill.id },
      select: { adminId: true, userId: true },
    })
    expect(survivingBill).toEqual({ adminId: admin2Id, userId: clientId })

    // Now deleting the second admin keeps client history (repoints to the
    // deleting admin) — bills first, then authored notes.
    const gone2 = await request(app)
      .delete(`/api/v1/users/${admin2Id}`)
      .set('Cookie', admin)
      .send({ password: ADMIN_PW })
    expect(gone2.status).toBe(204)
    const stillThere = await prisma.bill.findUnique({ where: { id: clientBill.body.bill.id }, select: { adminId: true } })
    expect(stillThere?.adminId).toBe(adminId)
    expect(await prisma.note.findUnique({ where: { id: authoredNote.body.note.id }, select: { adminId: true } }))
      .toEqual({ adminId: adminId })

    // Cleanup: the surviving bill's items first (Product is FK-restricted).
    await prisma.bill.delete({ where: { id: clientBill.body.bill.id } })
    await prisma.note.deleteMany({ where: { adminId: adminId, userId: clientId, content: 'about the client' } })
    await prisma.product.delete({ where: { id: productId } })
  })
})

// ---------------------------------------------------------------------------
// Products module
// ---------------------------------------------------------------------------

describe('products module', () => {
  it('enforces write roles and validates payloads', async () => {
    const admin = cookieOf(await login(`t_admin_${suffix}`, ADMIN_PW))
    const client = cookieOf(await login(`t_client_${suffix}`, USER_PW))

    const badSku = await request(app)
      .post('/api/v1/products')
      .set('Cookie', admin)
      .send({ name: 'Bad', sku: 'bad sku!', price: 3, quantity: 1 })
    expect(badSku.status).toBe(422)

    const create = await request(app)
      .post('/api/v1/products')
      .set('Cookie', admin)
      .send({ name: 'Test Lens', sku: `TL-${suffix.toUpperCase()}`, price: 99.99, quantity: 10 + (Number.parseInt(suffix.slice(-2), 36) % 5) })
    expect(create.status).toBe(201)
    const productId = create.body.product.id

    expect(
      (await request(app).post('/api/v1/products').set('Cookie', client).send({ name: 'x', sku: `ac-${suffix}`, price: 1 })).status,
    ).toBe(403)

    const lowOnly = await request(app)
      .get('/api/v1/products?lowStock=true')
      .set('Cookie', client)
    expect(lowOnly.status).toBe(200)
    expect(lowOnly.body.products.map((p: { id: string }) => p.id)).not.toContain(productId)

    const patch = await request(app)
      .patch(`/api/v1/products/${productId}`)
      .set('Cookie', admin)
      .send({ quantity: 3 })
    expect(patch.status).toBe(200)

    const deleted = await request(app).delete(`/api/v1/products/${productId}`).set('Cookie', admin)
    expect(deleted.status).toBe(204)
  })

  it('GET /products/:id returns a single product, 404 for unknown', async () => {
    const admin = cookieOf(await login(`t_admin_${suffix}`, ADMIN_PW))

    const create = await request(app)
      .post('/api/v1/products')
      .set('Cookie', admin)
      .send({ name: 'Single Probe', sku: `SGL-${suffix.toUpperCase()}`, price: 5, quantity: 2 })
    expect(create.status).toBe(201)
    const productId: string = create.body.product.id

    const single = await request(app).get(`/api/v1/products/${productId}`).set('Cookie', admin)
    expect(single.status).toBe(200)
    expect(single.body.product.id).toBe(productId)

    const missing = await request(app).get('/api/v1/products/nonexistent000000000000').set('Cookie', admin)
    expect([404, 422]).toContain(missing.status)

    await prisma.product.delete({ where: { id: productId } })
  })

  it('GET /products/categories returns the category list', async () => {
    const admin = cookieOf(await login(`t_admin_${suffix}`, ADMIN_PW))
    const res = await request(app).get('/api/v1/products/categories').set('Cookie', admin)
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.categories)).toBe(true)
  })

  it('duplicate SKU returns 409 CONFLICT', async () => {
    const admin = cookieOf(await login(`t_admin_${suffix}`, ADMIN_PW))
    const sku = `DUP-${suffix.toUpperCase()}`

    const first = await request(app)
      .post('/api/v1/products')
      .set('Cookie', admin)
      .send({ name: 'First', sku, price: 1, quantity: 1 })
    expect(first.status).toBe(201)

    const second = await request(app)
      .post('/api/v1/products')
      .set('Cookie', admin)
      .send({ name: 'Duplicate', sku, price: 2, quantity: 2 })
    expect(second.status).toBe(409)
    expect(second.body.error.code).toBe('CONFLICT')

    await prisma.product.delete({ where: { id: first.body.product.id } })
  })

  it('EMPLOYEE role can create, update and delete products', async () => {
    const emp = cookieOf(await login(`t_emp_${suffix}`, EMP_PW))
    const admin = cookieOf(await login(`t_admin_${suffix}`, ADMIN_PW))

    const create = await request(app)
      .post('/api/v1/products')
      .set('Cookie', emp)
      .send({ name: 'Emp Product', sku: `EP-${suffix.toUpperCase()}`, price: 7, quantity: 5 })
    expect(create.status).toBe(201)
    const productId: string = create.body.product.id

    const patch = await request(app)
      .patch(`/api/v1/products/${productId}`)
      .set('Cookie', emp)
      .send({ price: 9 })
    expect(patch.status).toBe(200)
    expect(patch.body.product.price).toBe(9)

    const del = await request(app).delete(`/api/v1/products/${productId}`).set('Cookie', admin)
    expect(del.status).toBe(204)
  })
})

// ---------------------------------------------------------------------------
// Bills module (race-safe stock math)
// ---------------------------------------------------------------------------

describe('bills module (race-safe stock math)', () => {
  let productId = ''
  let billId = ''

  it('runs the full consume → edit → restock cycle atomically', async () => {
    const admin = cookieOf(await login(`t_admin_${suffix}`, ADMIN_PW))

    const create = await request(app)
      .post('/api/v1/products')
      .set('Cookie', admin)
      .send({ name: 'Stock Probe', sku: `SP-${suffix.toUpperCase()}`, price: 10, quantity: 10 })
    productId = create.body.product.id

    // Oversell → 409 and ZERO stock change.
    const oversell = await request(app)
      .post('/api/v1/bills')
      .set('Cookie', admin)
      .send({ userId: clientId, items: [{ productId, quantity: 11 }] })
    expect(oversell.status).toBe(409)
    expect(oversell.body.error.code).toBe('INSUFFICIENT_STOCK')
    expect((await prisma.product.findUniqueOrThrow({ where: { id: productId } })).quantity).toBe(10)

    // Legit sale of 3.
    const bill = await request(app)
      .post('/api/v1/bills')
      .set('Cookie', admin)
      .send({ userId: clientId, notes: 'wife? no — daily spend', items: [{ productId, quantity: 3 }] })
    expect(bill.status).toBe(201)
    expect(bill.body.bill.amount).toBe(30)
    billId = bill.body.bill.id
    expect((await prisma.product.findUniqueOrThrow({ where: { id: productId } })).quantity).toBe(7)

    // GET /bills/:id returns the full bill.
    const single = await request(app).get(`/api/v1/bills/${billId}`).set('Cookie', admin)
    expect(single.status).toBe(200)
    expect(single.body.bill.id).toBe(billId)
    expect(single.body.bill.amount).toBe(30)

    // Edit to 5 → restock 3 then consume 5 → net stock 5.
    const edit = await request(app)
      .patch(`/api/v1/bills/${billId}`)
      .set('Cookie', admin)
      .send({ items: [{ productId, quantity: 5 }] })
    expect(edit.status).toBe(200)
    expect(edit.body.bill.amount).toBe(50)
    expect((await prisma.product.findUniqueOrThrow({ where: { id: productId } })).quantity).toBe(5)

    // Cancel → full restock.
    expect((await request(app).delete(`/api/v1/bills/${billId}`).set('Cookie', admin)).status).toBe(204)
    expect((await prisma.product.findUniqueOrThrow({ where: { id: productId } })).quantity).toBe(10)
  })

  it('lets USER roles read only their own bills', async () => {
    const client = cookieOf(await login(`t_client_${suffix}`, USER_PW))
    const list = await request(app).get('/api/v1/bills').set('Cookie', client)
    expect(list.status).toBe(200)
    // Whatever exists, every row belongs to this client.
    for (const bill of list.body.bills) {
      expect(bill.user.id).toBe(clientId)
    }
  })

  it('USER cannot GET a bill that belongs to another user', async () => {
    const admin = cookieOf(await login(`t_admin_${suffix}`, ADMIN_PW))
    const client = cookieOf(await login(`t_client_${suffix}`, USER_PW))

    // Create a bill for the EMPLOYEE (not the client); no need to auth as them here.
    const empBill = await request(app)
      .post('/api/v1/bills')
      .set('Cookie', admin)
      .send({ userId: employeeId, items: [{ productId, quantity: 1 }] })
    expect(empBill.status).toBe(201)
    const empBillId: string = empBill.body.bill.id

    // Client must be forbidden from reading the employee's bill.
    const forbidden = await request(app)
      .get(`/api/v1/bills/${empBillId}`)
      .set('Cookie', client)
    expect(forbidden.status).toBe(403)

    // Admin can read it fine.
    const ok = await request(app).get(`/api/v1/bills/${empBillId}`).set('Cookie', admin)
    expect(ok.status).toBe(200)

    await prisma.billItem.deleteMany({ where: { billId: empBillId } })
    await prisma.bill.delete({ where: { id: empBillId } })
    // Restore stock consumed above.
    await prisma.product.update({ where: { id: productId }, data: { quantity: { increment: 1 } } })
  })

  it('EMPLOYEE can create bills', async () => {
    const emp = cookieOf(await login(`t_emp_${suffix}`, EMP_PW))
    const admin = cookieOf(await login(`t_admin_${suffix}`, ADMIN_PW))

    const empBill = await request(app)
      .post('/api/v1/bills')
      .set('Cookie', emp)
      .send({ userId: clientId, items: [{ productId, quantity: 1 }] })
    expect(empBill.status).toBe(201)
    const empBillId: string = empBill.body.bill.id

    // Clean up.
    await request(app).delete(`/api/v1/bills/${empBillId}`).set('Cookie', admin)
  })

  it('cleans the probe product', async () => {
    await prisma.billItem.deleteMany({ where: { productId } })
    await prisma.product.deleteMany({ where: { id: productId } })
    await prisma.bill.deleteMany({ where: { id: billId } })
  })
})

// ---------------------------------------------------------------------------
// Notes module
// ---------------------------------------------------------------------------

describe('notes module', () => {
  it('scopes notes to the subject for USER roles and guards writes', async () => {
    const admin = cookieOf(await login(`t_admin_${suffix}`, ADMIN_PW))
    const client = cookieOf(await login(`t_client_${suffix}`, USER_PW))

    const aboutClient = await request(app)
      .post('/api/v1/notes')
      .set('Cookie', admin)
      .send({ userId: clientId, content: 'took 250 EGP', amount: 250 })
    expect(aboutClient.status).toBe(201)

    const unattached = await request(app)
      .post('/api/v1/notes')
      .set('Cookie', admin)
      .send({ content: 'daily spend only', amount: 10 })
    expect(unattached.status).toBe(201)

    // USER sees their subject note; other agents' may leak nothing about others.
    const seen = await request(app).get('/api/v1/notes').set('Cookie', client)
    expect(seen.status).toBe(200)
    for (const note of seen.body.notes) {
      expect(note.userId).toBe(clientId)
    }

    // USER cannot write a note.
    expect(
      (await request(app).post('/api/v1/notes').set('Cookie', client).send({ content: 'hack' })).status,
    ).toBe(403)

    await request(app)
      .delete(`/api/v1/notes/${aboutClient.body.note.id}`)
      .set('Cookie', admin)
    await request(app)
      .delete(`/api/v1/notes/${unattached.body.note.id}`)
      .set('Cookie', admin)
  })

  it('GET /notes/:id returns a single note; USER cannot see another subject\'s note', async () => {
    const admin = cookieOf(await login(`t_admin_${suffix}`, ADMIN_PW))
    const client = cookieOf(await login(`t_client_${suffix}`, USER_PW))

    // Note about the employee — the client is not the subject.
    const note = await request(app)
      .post('/api/v1/notes')
      .set('Cookie', admin)
      .send({ userId: employeeId, content: 'about the employee' })
    expect(note.status).toBe(201)
    const noteId: string = note.body.note.id

    // Admin can read it.
    const ok = await request(app).get(`/api/v1/notes/${noteId}`).set('Cookie', admin)
    expect(ok.status).toBe(200)
    expect(ok.body.note.id).toBe(noteId)

    // Client is forbidden — they are not the subject user.
    const forbidden = await request(app).get(`/api/v1/notes/${noteId}`).set('Cookie', client)
    expect(forbidden.status).toBe(403)

    await request(app).delete(`/api/v1/notes/${noteId}`).set('Cookie', admin)
  })

  it('PATCH /notes/:id updates content and amount; employee can only edit own notes', async () => {
    const admin = cookieOf(await login(`t_admin_${suffix}`, ADMIN_PW))
    const emp = cookieOf(await login(`t_emp_${suffix}`, EMP_PW))

    // Admin creates a note.
    const adminNote = await request(app)
      .post('/api/v1/notes')
      .set('Cookie', admin)
      .send({ content: 'original content', amount: 100 })
    expect(adminNote.status).toBe(201)
    const adminNoteId: string = adminNote.body.note.id

    // Employee creates a note.
    const empNote = await request(app)
      .post('/api/v1/notes')
      .set('Cookie', emp)
      .send({ content: 'emp note', amount: 50 })
    expect(empNote.status).toBe(201)
    const empNoteId: string = empNote.body.note.id

    // Admin can patch any note.
    const patchAdmin = await request(app)
      .patch(`/api/v1/notes/${adminNoteId}`)
      .set('Cookie', admin)
      .send({ content: 'updated content', amount: 200 })
    expect(patchAdmin.status).toBe(200)
    expect(patchAdmin.body.note.content).toBe('updated content')
    expect(patchAdmin.body.note.amount).toBe(200)

    // Employee can patch their own note.
    const patchEmpOwn = await request(app)
      .patch(`/api/v1/notes/${empNoteId}`)
      .set('Cookie', emp)
      .send({ content: 'emp updated' })
    expect(patchEmpOwn.status).toBe(200)

    // Employee CANNOT patch the admin's note (author-only guard).
    const patchEmpOther = await request(app)
      .patch(`/api/v1/notes/${adminNoteId}`)
      .set('Cookie', emp)
      .send({ content: 'sneaky edit' })
    expect(patchEmpOther.status).toBe(403)

    // Cleanup.
    await request(app).delete(`/api/v1/notes/${adminNoteId}`).set('Cookie', admin)
    await request(app).delete(`/api/v1/notes/${empNoteId}`).set('Cookie', admin)
  })
})
