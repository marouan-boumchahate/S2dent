import { Router } from 'express'
import { validate } from '../../../middlewares/validate.middleware.js'
import { issueIdentitySchema } from './academy.identity.validator.js'
import { issueIdentity } from './academy.identity.controller.js'

const router = Router()

router.post(
  '/',
  validate(issueIdentitySchema),
  issueIdentity,
)

export default router