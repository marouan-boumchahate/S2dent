import { Router } from 'express'
import { validate } from '../../../middlewares/validate.middleware.js'
import { issueIdentitySchema, revokeIdentitySchema } from './professor.identity.validator.js'
import { issueIdentity, revokeIdentity, getMyIdentity, getIdentityByAddress, getIdentityById } from './professor.identity.controller.js'
import authenticate from '../../../middlewares/auth.middleware.js'
import requireRole from '../../../middlewares/role.middleware.js'

const router = Router()

router.get(
  '/me',
  authenticate,
  requireRole('professor'),
  getMyIdentity,
)
router.get(
  '/by-id/:id',
  authenticate,
  requireRole('academy'),
  getIdentityById,
)
router.get(
  '/:address',
  getIdentityByAddress,
)

router.post(
  '/issue',
  validate(issueIdentitySchema),
  issueIdentity,
)
router.post(
  '/revoke',
  authenticate,
  requireRole('academy'),
  validate(revokeIdentitySchema),
  revokeIdentity,
)

export default router