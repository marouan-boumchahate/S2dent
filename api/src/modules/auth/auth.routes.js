import { Router } from 'express';
import { validate } from '../../middlewares/validate.middleware.js';
import { authLimiter, otpLimiter } from '../../middlewares/rateLimit.middleware.js';
import { 
    generateNonceSchema, 
    verifyAdminSignatureSchema,
    verifySignatureSchema, 
    refreshTokenSchema, 
    sendOtpSchema
} from './auth.validator.js';
import { 
    generateAdminNonceController,
    generateNonceController, 
    verifySignatureController, 
    verifyAdminSignatureController,
    refreshTokenController, 
    logoutController, 
    sendOtpController
} from './auth.controller.js';

const router = Router();


router.get(
    '/admin/nonce',
    generateAdminNonceController
)
router.get(
    '/nonce',
    validate(generateNonceSchema, 'query'),
    generateNonceController
)
router.post(
    '/verify',
    authLimiter,
    validate(verifySignatureSchema),
    verifySignatureController
)
router.post(
    '/admin/verify',
    authLimiter,
    validate(verifyAdminSignatureSchema, 400),
    verifyAdminSignatureController
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
    otpLimiter,
    validate(sendOtpSchema),
    sendOtpController
)


export default router;
