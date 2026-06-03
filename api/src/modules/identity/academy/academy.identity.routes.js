import { Router } from 'express'
import { validate } from '../../../middlewares/validate.middleware.js'
import { issueIdentitySchema, revokeIdentitySchema } from './academy.identity.validator.js'
import { issueIdentity, revokeIdentity, getMyIdentity, getIdentityByAddress, getIdentityById } from './academy.identity.controller.js'
import authenticate from '../../../middlewares/auth.middleware.js'
import requireRole from '../../../middlewares/role.middleware.js'

const router = Router()

router.get(
  '/me',
  authenticate,
  requireRole('academy'),
  getMyIdentity,
)
router.get(
  '/by-id/:id',
  authenticate,
  requireRole('admin'),
  getIdentityById,
)
router.get(
  '/:address',
  getIdentityByAddress,
)

router.post(
  '/issue',
  authenticate,
  requireRole('admin'),
  validate(issueIdentitySchema),
  issueIdentity,
)
router.post(
  '/revoke',
  authenticate,
  requireRole('admin'),
  validate(revokeIdentitySchema),
  revokeIdentity,
)

export default router