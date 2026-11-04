/** Application error carrying an HTTP status and stable machine code. */
export class AppError extends Error {
  readonly status: number
  readonly code: string

  constructor(status: number, code: string, message: string) {
    super(message)
    this.name = 'AppError'
    this.status = status
    this.code = code
  }
}

export const invalidCredentials = () =>
  new AppError(401, 'INVALID_CREDENTIALS', 'Invalid username or password')

export const unauthorized = () =>
  new AppError(401, 'UNAUTHORIZED', 'Authentication required')

export const forbidden = () =>
  new AppError(403, 'FORBIDDEN', 'You do not have permission to perform this action')

export const notFound = (what: string) =>
  new AppError(404, 'NOT_FOUND', `${what} not found`)

export const conflict = (message: string) =>
  new AppError(409, 'CONFLICT', message)

export const insufficientStock = (sku: string) =>
  new AppError(409, 'INSUFFICIENT_STOCK', `Not enough stock for product ${sku}`)
