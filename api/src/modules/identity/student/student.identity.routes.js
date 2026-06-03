import { Router } from 'express'
import { validate } from '../../../middlewares/validate.middleware.js'
import { issueReqIdentitySchema, issueIdentitySchema, revokeIdentitySchema } from './student.identity.validator.js'
import { 
  requestIdentityIssuanceController,
  generateIdentitySignatureSchemaController,
  issueIdentityController,
  revokeIdentity, 
  getMyIdentity, 
  getIdentityByAddress, 
  getIdentityById 
} from './student.identity.controller.js'
import authenticate from '../../../middlewares/auth.middleware.js'
import requireRole from '../../../middlewares/role.middleware.js'

const router = Router()

router.get(
  '/me',
  authenticate,
  requireRole('student'),
  getMyIdentity,
)
router.get(
  '/by-user-id/:id',
  authenticate,
  requireRole('academy', 'professor'),
  getIdentityById,
)
router.get(
  '/:address',
  getIdentityByAddress,
)
router.get(
  '/pending/:wallet_address/schema',
  authenticate,
  requireRole('academy'),
  generateIdentitySignatureSchemaController,
)
router.post(
  '/request-issuance',
  validate(issueReqIdentitySchema),
  requestIdentityIssuanceController,
)
router.post(
  '/issue',
  authenticate,
  requireRole('academy'),
  validate(issueIdentitySchema),
  issueIdentityController,
)
router.delete(
  '/revoke',
  authenticate,
  requireRole('academy'),
  validate(revokeIdentitySchema),
  revokeIdentity,
)

export default router