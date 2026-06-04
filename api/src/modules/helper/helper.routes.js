import { Router } from 'express';
import { validate } from '../../middlewares/validate.middleware.js';
import { signingDataSchema, signingDataStringSchema } from './helper.validator.js';
import { signingDataController, signingDataStringController } from './helper.controller.js';

const router = Router();

router.get('/health', (req, res) => res.status(200).json({ status: 'ok' }));

router.get(
    '/signature',
    validate(signingDataSchema),
    signingDataController
)
router.get(
    '/signature-string',
    validate(signingDataStringSchema),
    signingDataStringController
)

export default router;
