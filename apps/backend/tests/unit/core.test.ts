import { describe, expect, it } from 'vitest'
import { SESSION_COOKIE } from '../../src/modules/auth/auth.constants'
import { createUserSchema, updateUserSchema, listUsersQuerySchema } from '../../src/modules/users/users.validation'
import {
  createBillSchema,
  createBillSchema as billSchema,
} from '../../src/modules/bills/bills.validation'
import { createProductSchema } from '../../src/modules/products/products.validation'
import { createNoteSchema } from '../../src/modules/notes/notes.validation'
import {
  generateSessionToken,
  hashSessionToken,
} from '../../src/lib/session'

describe('session token utilities', () => {
  it('produces two independent 64-char-ish base64url tokens', () => {
    const t1 = generateSessionToken()
    const t2 = generateSessionToken()
    expect(t1).not.toBe(t2)
    expect(t1).toMatch(/^[A-Za-z0-9_-]+$/)
    expect(t1.length).toBeGreaterThan(40)
  })

  it('hashes deterministically and never reveals the token', () => {
    const token = generateSessionToken()
    const hash = hashSessionToken(token)
    expect(hashSessionToken(token)).toBe(hash) // stable
    expect(hash).not.toContain(token)
    expect(hash).toMatch(/^[a-f0-9]{64}$/)
  })
})

describe('session cookie name contract', () => {
  it('is a stable lowercase cookie name the frontend can rely on', () => {
    expect(SESSION_COOKIE).toBe('lt_session')
  })
})

describe('user validation', () => {
  const valid = {
    username: 'ada.l',
    email: 'Ada@Example.com'.toLowerCase(),
    phone: '+201234567890',
    password: 'Str0ngPass!',
  }

  it('accepts a valid user with default role USER', async () => {
    const parsed = await createUserSchema.parseAsync({ ...valid })
    expect(parsed.role).toBe('USER')
    expect(parsed.email).toBe('ada@example.com')
  })

  it('rejects weak passwords, bad phones and injected extra keys', async () => {
    await expect(
      createUserSchema.parseAsync({ ...valid, password: 'short' }),
    ).rejects.toThrow()
    await expect(
      createUserSchema.parseAsync({ ...valid, phone: 'call me maybe' }),
    ).rejects.toThrow()
    await expect(
      createUserSchema.parseAsync({ ...valid, isAdmin: true }),
    ).rejects.toThrow()
  })

  it('refuses empty update bodies', async () => {
    await expect(updateUserSchema.parseAsync({})).rejects.toThrow()
  })

  it('rejects out-of-bounds pagination', async () => {
    await expect(listUsersQuerySchema.parseAsync({ limit: '150' })).rejects.toThrow()
  })
})

describe('bill validation', () => {
  it('requires at least one item and sane quantities', async () => {
    await expect(createBillSchema.parseAsync({ userId: 'cm' , items: [] })).rejects.toThrow()
    await expect(
      billSchema.parseAsync({ userId: 'c'.repeat(25), items: [{ productId: 'p', quantity: 0 }] }),
    ).rejects.toThrow()
  })
})

describe('product validation', () => {
  it('uppercases the SKU and blocks >2 decimal prices', async () => {
    const parsed = await createProductSchema.parseAsync({
      name: 'Lens',
      sku: 'lt-lens-x',
      price: 12.5,
      quantity: 3,
    })
    expect(parsed.sku).toBe('LT-LENS-X')

    await expect(
      createProductSchema.parseAsync({ name: 'Lens', sku: 'lx', price: 1.005, quantity: 1 }),
    ).rejects.toThrow()
  })
})

describe('note validation', () => {
  it('keeps content bounded and amount non-negative', async () => {
    await expect(createNoteSchema.parseAsync({ content: '' } as object)).rejects.toThrow()
    await expect(createNoteSchema.parseAsync({ content: 'ok', amount: -5 })).rejects.toThrow()
  })
})
