import { Router } from 'express'
import { validate } from '../../../middlewares/validate.middleware.js'
import { issueIdentitySchema, revokeIdentitySchema } from './student.identity.validator.js'
import { issueIdentity, revokeIdentity } from './student.identity.controller.js'

const router = Router()

router.post(
  '/issue',
  validate(issueIdentitySchema),
  issueIdentity,
)

router.post(
  '/revoke',
  validate(revokeIdentitySchema),
  revokeIdentity,
)

export default router