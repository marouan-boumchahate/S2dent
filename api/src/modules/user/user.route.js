import { Router } from 'express';
import { validate } from '../../middlewares/validate.middleware.js';
import { createUserSchema } from './user.validator.js';
import { createUserController } from './user.controller.js';

const router = Router();

router.post(
  '/',
  validate(createUserSchema),
  createUserController,
);

export default router;
