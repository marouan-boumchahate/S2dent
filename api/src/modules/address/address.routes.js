import { Router } from 'express';
import { validate } from '../../middlewares/validate.middleware.js';
import { createAddressSchema, updateAddressSchema } from './address.validator.js';
import { createAddressController, updateAddressController } from './address.controller.js';

const router = Router();

router.post(
  '/',
  validate(createAddressSchema),
  createAddressController,
);

router.put(
  '/:id',
  validate(updateAddressSchema),
  updateAddressController,
);

export default router;
