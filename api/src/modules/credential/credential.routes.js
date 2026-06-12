import { Router } from 'express';
import authenticate from '../../middlewares/auth.middleware.js';
import requireRole from '../../middlewares/role.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { credentialLimiter } from '../../middlewares/rateLimit.middleware.js';
import { 
    createCredentialSchema, 
    issueCredentialSchema,
    revokeCredentialSchema,
    verifyCredentialTokenSchema
} from './credential.validator.js';
import { 
    createCredentialController,
    issueCredentialController,
    revokeCredentialController,
    fetchCredentialController,
    fetchAllCredentialsController,
    getCredentialSignatureSchemaController,
    fetchCredentialForVerificationController,
    generateVerifierCredentialTokenController
} from './credential.controller.js';


const router = Router();

router.get(
    '/',
    authenticate,
    requireRole('student', 'professor', 'academy'),
    fetchAllCredentialsController
)
router.get(
    '/verification',
    authenticate,
    requireRole('verifier'),
    fetchCredentialForVerificationController
)
router.get(
    '/:id/signature-schema',
    authenticate,
    requireRole('student', 'professor', 'academy', 'verifier'),
    getCredentialSignatureSchemaController
)
router.get(
    '/:id',
    authenticate,
    requireRole('student', 'professor', 'academy'),
    fetchCredentialController
)
router.post(
    '/',
    authenticate,
    requireRole('professor', 'academy'),
    credentialLimiter,
    validate(createCredentialSchema),
    createCredentialController
);
router.post(
    '/:id/token',
    authenticate,
    requireRole('student'),
    credentialLimiter,
    validate(verifyCredentialTokenSchema),
    generateVerifierCredentialTokenController
)
router.post(
    '/:id/issue',
    authenticate,
    requireRole('professor', 'academy'),
    credentialLimiter,
    validate(issueCredentialSchema),
    issueCredentialController
);
router.delete(
    '/:id/revoke',
    authenticate,
    requireRole('academy'),
    credentialLimiter,
    validate(revokeCredentialSchema),
    revokeCredentialController
);


export default router;
