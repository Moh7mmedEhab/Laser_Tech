export const SESSION_COOKIE = 'lt_session'
/** Sessions expire after this many days regardless of activity. */
export const SESSION_TTL_DAYS = 30
export const API_PREFIX = '/api/v1'

/**
 * Reuse a constant dummy hash so unknown identifiers take the same time as
 * known ones, defeating user-enumeration timing side channels.
 */
export const DUMMY_BCRYPT_HASH = '$2b$10$CwTycUXWue0Thq9StjUM0uJ8.PUr.lq0QupmTPn0ab0N1tLCgpMGW'
