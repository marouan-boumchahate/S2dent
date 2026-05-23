import { Router } from 'express';
import { validate } from '../../middlewares/validate.middleware.js';
import { createUserSchema, updateUserSchema } from './user.validator.js';
import {
  createUserController,
  updateUserController,
  getUserByIdController,
  getMyProfileController,
} from './user.controller.js';
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
router.get(
  '/me',
  authenticate,
  requireRole('professor', 'student'),
  getMyProfileController,
);
router.get(
  '/:id',
  authenticate,
  requireRole('academy'),
  getUserByIdController,
);

export default router;
