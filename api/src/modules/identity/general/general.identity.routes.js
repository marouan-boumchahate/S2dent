import { Router } from 'express'
import { getWaitingIdentitiesController } from './general.identity.controller.js'
import authenticate from '../../../middlewares/auth.middleware.js'
import requireRole from '../../../middlewares/role.middleware.js'

const router = Router()

router.get(
  '/waiting',
  authenticate,
  requireRole('academy'),
  getWaitingIdentitiesController,
)

export default router