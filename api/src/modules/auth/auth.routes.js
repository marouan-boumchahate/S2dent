import { Router } from 'express';
import { validate } from '../../middlewares/validate.middleware.js';
import { generateNonceSchema, verifySignatureSchema, refreshTokenSchema } from './auth.validator.js';
import { generateNonceController, verifySignatureController, refreshTokenController } from './auth.controller.js';

const router = Router();

router.get(
    '/nonce',
    validate(generateNonceSchema, 'query'),
    generateNonceController
)

router.post(
    '/verify',
    validate(verifySignatureSchema),
    verifySignatureController
)

router.post(
    '/refresh',
    validate(refreshTokenSchema),
    refreshTokenController
)

export default router;
