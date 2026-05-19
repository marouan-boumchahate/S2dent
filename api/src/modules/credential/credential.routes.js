import { Router } from 'express';
import authenticate from '../../middlewares/auth.middleware.js';
import requireRole from '../../middlewares/role.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { 
    createCredentialSchema, 
    issueCredentialSchema,
    revokeCredentialSchema
} from './credential.validator.js';
import { 
    createCredentialController,
    issueCredentialController,
    revokeCredentialController 
} from './credential.controller.js';

const router = Router();

router.post(
    '/',
    authenticate,
    requireRole('professor', 'academy'),
    validate(createCredentialSchema),
    createCredentialController
);
router.post(
    '/:id/issue',
    authenticate,
    requireRole('professor', 'academy'),
    validate(issueCredentialSchema),
    issueCredentialController
);
router.delete(
    '/:id/revoke',
    authenticate,
    requireRole('academy'),
    validate(revokeCredentialSchema),
    revokeCredentialController
);

export default router;
