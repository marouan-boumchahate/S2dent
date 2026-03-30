import { Router } from 'express';
import { validate } from '../../middlewares/validate.middleware.js';
import { createAddressSchema } from './address.validator.js';
import { createAddressController } from './address.controller.js';

const router = Router();

router.post(
  '/',
  validate(createAddressSchema),
  createAddressController,
);

export default router;
