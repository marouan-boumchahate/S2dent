import { Router } from 'express';
import { validate } from '../../middlewares/validate.middleware.js';
import { generateNonceSchema, verifySignatureSchema, refreshTokenSchema, sendOtpSchema } from './auth.validator.js';
import { 
    generateNonceController, 
    verifySignatureController, 
    refreshTokenController, 
    logoutController, 
    sendOtpController 
} from './auth.controller.js';

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

router.delete(
    '/logout',
    validate(refreshTokenSchema),
    logoutController
)

router.post(
    '/otp/send',
    validate(sendOtpSchema),
    sendOtpController
)

export default router;
