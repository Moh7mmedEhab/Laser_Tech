import crypto from 'node:crypto'

/** Cryptographically random opaque session token, safe to put in a cookie. */
export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('base64url')
}

/** Only the hash of the token is ever stored; a DB leak cannot resurrect sessions. */
export function hashSessionToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}
