import { Router } from 'express'
import { requireAuth, requireRole } from '../../middlewares/auth.js'
import * as controller from './products.controller.js'

export const productRoutes = Router()

// Reading the catalog is fine for any signed-in role; mutations are for
// admins and employees only.
productRoutes.use(requireAuth)
productRoutes.get('/', controller.list)
productRoutes.get('/categories', controller.categories)
productRoutes.get('/:id', controller.get)
productRoutes.post('/', requireRole('ADMIN', 'EMPLOYEE'), controller.create)
productRoutes.patch('/:id', requireRole('ADMIN', 'EMPLOYEE'), controller.update)
productRoutes.delete('/:id', requireRole('ADMIN', 'EMPLOYEE'), controller.remove)
