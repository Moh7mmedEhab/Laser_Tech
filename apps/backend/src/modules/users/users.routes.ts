import { Router } from 'express'
import { requireAuth, requireRole } from '../../middlewares/auth.js'
import * as controller from './users.controller.js'

export const userRoutes = Router()

// Users are admin-managed resources entirely.
userRoutes.use(requireAuth, requireRole('ADMIN'))
userRoutes.get('/', controller.list)
userRoutes.post('/', controller.create)
userRoutes.get('/:id', controller.get)
userRoutes.patch('/:id', controller.update)
userRoutes.delete('/:id', controller.remove)
