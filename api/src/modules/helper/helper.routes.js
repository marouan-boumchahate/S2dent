import { Router } from 'express';
import { validate } from '../../middlewares/validate.middleware.js';
import { signingDataSchema } from './helper.validator.js';
import { signingDataController } from './helper.controller.js';

const router = Router();

router.get(
    '/signature',
    validate(signingDataSchema),
    signingDataController
)

export default router;
