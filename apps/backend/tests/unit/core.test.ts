import { describe, expect, it } from 'vitest'
import { SESSION_COOKIE } from '../../src/modules/auth/auth.constants'
import { createUserSchema, updateUserSchema, listUsersQuerySchema } from '../../src/modules/users/users.validation'
import {
  createBillSchema,
  createBillSchema as billSchema,
  updateBillSchema,
  listBillsQuerySchema,
} from '../../src/modules/bills/bills.validation'
import { createProductSchema, updateProductSchema, listProductsQuerySchema } from '../../src/modules/products/products.validation'
import { createNoteSchema, updateNoteSchema } from '../../src/modules/notes/notes.validation'
import {
  generateSessionToken,
  hashSessionToken,
} from '../../src/lib/session'
import { mergeItems } from '../../src/modules/bills/bills.service'
import { changePasswordSchema } from '../../src/modules/auth/auth.validation'

// ---------------------------------------------------------------------------
// Session token utilities
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Session cookie name contract
// ---------------------------------------------------------------------------

describe('session cookie name contract', () => {
  it('is a stable lowercase cookie name the frontend can rely on', () => {
    expect(SESSION_COOKIE).toBe('lt_session')
  })
})

// ---------------------------------------------------------------------------
// User validation
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Password schema (shared policy)
// ---------------------------------------------------------------------------

describe('password schema (via changePasswordSchema)', () => {
  const base = { currentPassword: 'OldPass1!', newPassword: '' }

  it('rejects passwords shorter than 8 chars', async () => {
    await expect(
      changePasswordSchema.parseAsync({ ...base, newPassword: 'Aa1!' }),
    ).rejects.toThrow()
  })

  it('accepts a password of exactly 8 chars meeting all rules', async () => {
    await expect(
      changePasswordSchema.parseAsync({ ...base, newPassword: 'Aa1!aaaa' }),
    ).resolves.toBeDefined()
  })

  it('rejects a password with no uppercase letter', async () => {
    await expect(
      changePasswordSchema.parseAsync({ ...base, newPassword: 'alllower1!' }),
    ).rejects.toThrow()
  })

  it('rejects a password with no digit', async () => {
    await expect(
      changePasswordSchema.parseAsync({ ...base, newPassword: 'NoDigitHere!' }),
    ).rejects.toThrow()
  })
})

// ---------------------------------------------------------------------------
// Bill validation
// ---------------------------------------------------------------------------

describe('bill validation', () => {
  it('requires at least one item and sane quantities', async () => {
    await expect(createBillSchema.parseAsync({ userId: 'cm' , items: [] })).rejects.toThrow()
    await expect(
      billSchema.parseAsync({ userId: 'c'.repeat(25), items: [{ productId: 'p', quantity: 0 }] }),
    ).rejects.toThrow()
  })

  it('updateBillSchema accepts notes:null to clear the notes field', async () => {
    // notes is nullable on update — clearing it must not throw
    await expect(
      updateBillSchema.parseAsync({ notes: null }),
    ).resolves.toBeDefined()
  })

  it('listBillsQuerySchema defaults sort to newest and passes explicit order', async () => {
    const q = await listBillsQuerySchema.parseAsync({})
    expect(q.sort).toBe('newest')

    const q2 = await listBillsQuerySchema.parseAsync({ sort: 'amount', order: 'asc' })
    expect(q2.sort).toBe('amount')
    expect(q2.order).toBe('asc')
  })
})

// ---------------------------------------------------------------------------
// Product validation
// ---------------------------------------------------------------------------

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

  it('updateProductSchema accepts (and defaults) an empty partial body', async () => {
    // All fields are optional on a PATCH, but {} provides nothing useful.
    // Zod's .partial() keeps the create-time DEFAULTS, so an empty body
    // parses to { category: 'General', quantity: 0 }. The schema itself does
    // not enforce the "at least one field" refine that users.updateUserSchema
    // does — pinned here so a future refine addition is a deliberate change.
    const parsed = await updateProductSchema.parseAsync({})
    expect(parsed).toEqual({ category: 'General', quantity: 0 })
  })

  it('listProductsQuerySchema transforms lowStock string to boolean', async () => {
    const t = await listProductsQuerySchema.parseAsync({ lowStock: 'true' })
    expect(t.lowStock).toBe(true)

    const f = await listProductsQuerySchema.parseAsync({ lowStock: 'false' })
    expect(f.lowStock).toBe(false)

    const u = await listProductsQuerySchema.parseAsync({})
    expect(u.lowStock).toBeUndefined()
  })

  it('listProductsQuerySchema defaults sort to name', async () => {
    const q = await listProductsQuerySchema.parseAsync({})
    expect(q.sort).toBe('name')
    expect(q.page).toBe(1)
    expect(q.limit).toBe(20)
  })
})

// ---------------------------------------------------------------------------
// Note validation
// ---------------------------------------------------------------------------

describe('note validation', () => {
  it('keeps content bounded and amount non-negative', async () => {
    await expect(createNoteSchema.parseAsync({ content: '' } as object)).rejects.toThrow()
    await expect(createNoteSchema.parseAsync({ content: 'ok', amount: -5 })).rejects.toThrow()
  })

  it('updateNoteSchema rejects an empty body', async () => {
    // The refine guard: at least one key must be present.
    await expect(updateNoteSchema.parseAsync({})).rejects.toThrow()
  })
})

// ---------------------------------------------------------------------------
// mergeItems pure function
// ---------------------------------------------------------------------------

describe('mergeItems (bill line deduplication)', () => {
  it('passes a single item through unchanged', () => {
    const result = mergeItems([{ productId: 'pid1', quantity: 3 }])
    expect(result).toEqual([{ productId: 'pid1', quantity: 3 }])
  })

  it('merges duplicate productIds by summing their quantities', () => {
    const result = mergeItems([
      { productId: 'pid1', quantity: 2 },
      { productId: 'pid1', quantity: 5 },
    ])
    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({ productId: 'pid1', quantity: 7 })
  })

  it('keeps independent products as separate lines', () => {
    const result = mergeItems([
      { productId: 'pid1', quantity: 1 },
      { productId: 'pid2', quantity: 4 },
    ])
    expect(result).toHaveLength(2)
    expect(result.map((r) => r.productId).sort()).toEqual(['pid1', 'pid2'].sort())
  })

  it('handles three entries where two share a productId', () => {
    const result = mergeItems([
      { productId: 'a', quantity: 1 },
      { productId: 'b', quantity: 2 },
      { productId: 'a', quantity: 3 },
    ])
    const byId = Object.fromEntries(result.map((r) => [r.productId, r.quantity]))
    expect(byId['a']).toBe(4)
    expect(byId['b']).toBe(2)
  })
})
