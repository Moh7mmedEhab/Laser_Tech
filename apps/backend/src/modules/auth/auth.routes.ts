import { Router } from 'express'
import { authLimiter } from '../../lib/rate-limit.js'
import { requireAuth } from '../../middlewares/auth.js'
import * as controller from './auth.controller.js'

export const authRoutes = Router()

authRoutes.post('/login', authLimiter, controller.login)
authRoutes.post('/logout', controller.logout)

// Everything below requires a valid session cookie.
authRoutes.use(requireAuth)
authRoutes.get('/me', controller.me)
authRoutes.patch('/password', controller.changePassword)
authRoutes.get('/sessions', controller.listSessions)
authRoutes.delete('/sessions', controller.revokeAllOtherSessions)
authRoutes.delete('/sessions/:id', controller.revokeOneSession)
authRoutes.get('/login-history', controller.loginHistory)
