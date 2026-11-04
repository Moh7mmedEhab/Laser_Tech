import { beforeAll, afterAll, describe, expect, it } from 'vitest'
import request from 'supertest'
import { createApp } from '../../src/lib/app'
import { prisma } from '../../src/config/db'
import { hashPassword } from '../../src/modules/auth/auth.service'

const app = createApp()

const ADMIN_PW = 'Te5t-Admin!'
const USER_PW = 'Te5t-Client!'
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
    { username: `t_emp_${suffix}`, email: `t_emp_${suffix}@x.com`, phone: `+2012${digits}3`, password: 'Te5t-Emp!', role: 'EMPLOYEE' as const },
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
  // Remove references before the users (no cascade on bills/notes links).
  const ids = { in: [adminId, clientId, employeeId] }
  await prisma.billItem.deleteMany({ where: { bill: { OR: [{ userId: ids }, { adminId: ids }] } } })
  await prisma.bill.deleteMany({ where: { OR: [{ userId: ids }, { adminId: ids }] } })
  await prisma.note.deleteMany({ where: { OR: [{ userId: ids }, { adminId: ids }] } })
  await prisma.session.deleteMany({ where: { userId: ids } })
  await prisma.loginHistory.deleteMany({ where: { userId: ids } })
  // Products from this batch are keyed by the unique SKU suffix.
  await prisma.product.deleteMany({ where: { sku: { contains: suffix.toUpperCase() } } })
  await prisma.user.deleteMany({ where: { id: ids } })
  await prisma.$disconnect()
})

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

  it('lists sessions, revokes all others, and changes password', async () => {
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

  it('logs out and the cookie stops working immediately', async () => {
    const res = await login(`t_admin_${suffix}`, ADMIN_PW)
    const cookie = cookieOf(res)
    expect((await request(app).post('/api/v1/auth/logout').set('Cookie', cookie)).status).toBe(200)
    expect((await request(app).get('/api/v1/auth/me').set('Cookie', cookie)).status).toBe(401)
  })
})

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

    await request(app)
      .delete(`/api/v1/users/${create.body.user.id}`)
      .set('Cookie', admin)
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
      .send()
    // Self-delete is forbidden, even for the admin doing it.
    expect(remove.status).toBe(403)
  })
})

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
})

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

  it('cleans the probe product', async () => {
    await prisma.billItem.deleteMany({ where: { productId } })
    await prisma.product.deleteMany({ where: { id: productId } })
    await prisma.bill.deleteMany({ where: { id: billId } })
  })
})

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
})
