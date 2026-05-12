import { Router } from 'express'
import { validate } from '../../../middlewares/validate.middleware.js'
import { issueIdentitySchema, revokeIdentitySchema } from './student.identity.validator.js'
import { issueIdentity, revokeIdentity } from './student.identity.controller.js'
import authenticate from '../../../middlewares/auth.middleware.js'
import requireRole from '../../../middlewares/role.middleware.js'

const router = Router()

router.post(
  '/issue',
  validate(issueIdentitySchema),
  issueIdentity,
)

router.post(
  '/revoke',
  authenticate,
  requireRole('academy'),
  validate(revokeIdentitySchema, 'query'),
  revokeIdentity,
)

export default router