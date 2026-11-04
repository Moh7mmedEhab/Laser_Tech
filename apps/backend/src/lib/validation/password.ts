import { z } from 'zod'

/**
 * Shared password policy everywhere a password can be set (sign-up, user
 * create/update, password change): 8+ chars with lower, upper and digit.
 */
export const passwordSchema = z
  .string()
  .min(8)
  .max(128)
  .regex(/[a-z]/, 'Must contain a lowercase letter')
  .regex(/[A-Z]/, 'Must contain an uppercase letter')
  .regex(/[0-9]/, 'Must contain a digit')
