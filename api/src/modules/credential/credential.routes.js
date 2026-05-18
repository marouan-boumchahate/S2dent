import { Router } from 'express';
import authenticate from '../../middlewares/auth.middleware.js';
import requireRole from '../../middlewares/role.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { createCredentialSchema } from './credential.validator.js';
import * as credentialController from './credential.controller.js';

const router = Router();

router.post(
    '/',
    authenticate,
    requireRole('professor', 'academy'),
    validate(createCredentialSchema),
    credentialController.issue
);

export default router;
