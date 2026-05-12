import { Router } from 'express';
import { validate } from '../../middlewares/validate.middleware.js';
import { createUserSchema, updateUserSchema } from './user.validator.js';
import { createUserController, updateUserController } from './user.controller.js';
import authenticate from '../../middlewares/auth.middleware.js';
import requireRole from '../../middlewares/role.middleware.js';

const router = Router();

router.post(
  '/',
  authenticate,
  requireRole('academy'),
  validate(createUserSchema),
  createUserController,
);

router.put(
  '/',
  authenticate,
  requireRole('professor', 'student'),
  validate(updateUserSchema),
  updateUserController,
);

export default router;
