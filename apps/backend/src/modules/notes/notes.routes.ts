import { Router } from 'express'
import { requireAuth, requireRole } from '../../middlewares/auth.js'
import * as controller from './notes.controller.js'

export const noteRoutes = Router()

noteRoutes.use(requireAuth)
noteRoutes.get('/', controller.list)
noteRoutes.get('/:id', controller.get)
// Notes are written by admins and employees; USERs only read their own.
noteRoutes.use(requireRole('ADMIN', 'EMPLOYEE'))
noteRoutes.post('/', controller.create)
noteRoutes.patch('/:id', controller.update)
noteRoutes.delete('/:id', controller.remove)
