import { Router } from 'express'
import { requireAuth, requireRole } from '../../middlewares/auth.js'
import * as controller from './bills.controller.js'

export const billRoutes = Router()

billRoutes.use(requireAuth)
billRoutes.get('/', controller.list)
billRoutes.get('/:id', controller.get)
// Writing bills is for admins and employees; USERs read their own only.
billRoutes.post('/', requireRole('ADMIN', 'EMPLOYEE'), controller.create)
billRoutes.patch('/:id', requireRole('ADMIN', 'EMPLOYEE'), controller.update)
billRoutes.delete('/:id', requireRole('ADMIN', 'EMPLOYEE'), controller.remove)
