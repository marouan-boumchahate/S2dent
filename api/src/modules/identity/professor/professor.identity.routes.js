import { Router } from 'express'
import { validate } from '../../../middlewares/validate.middleware.js'
import { 
  issueReqIdentitySchema,
  issueIdentitySchema,
  revokeIdentitySchema 
} from './professor.identity.validator.js'
import { 
  requestIdentityIssuanceController, 
  issueIdentityController,
  generateIdentitySignatureSchemaController,
  revokeIdentity, 
  getMyIdentity, 
  getIdentityByAddress, 
  getIdentityById 
} from './professor.identity.controller.js'
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