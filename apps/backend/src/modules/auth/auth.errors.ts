import { AppError } from '../../errors/app.errors.js'

export const invalidCredentials = () =>
  new AppError(401, 'INVALID_CREDENTIALS', 'Invalid credentials')

export const sessionExpired = () =>
  new AppError(401, 'SESSION_EXPIRED', 'Session is no longer valid')

export const sessionsNotFound = () =>
  new AppError(404, 'SESSION_NOT_FOUND', 'Session not found')

export const wrongPassword = () =>
  new AppError(401, 'INVALID_CREDENTIALS', 'Current password is incorrect')
