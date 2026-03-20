import { Router } from 'express'
import { validate } from '../../../middlewares/validate.middleware.js'
import { issueIdentitySchema } from './professor.identity.validator.js'
import { issueIdentity } from './professor.identity.controller.js'

const router = Router()

router.post(
  '/issue',
  validate(issueIdentitySchema),
  issueIdentity,
)

export default router