import { Router } from 'express';
import { validate } from '../../middlewares/validate.middleware.js';
import { createUserSchema, updateUserSchema } from './user.validator.js';
import { createUserController, updateUserController } from './user.controller.js';

const router = Router();

router.post(
  '/',
  validate(createUserSchema),
  createUserController,
);

router.put(
  '/:id',
  validate(updateUserSchema),
  updateUserController,
);

export default router;
