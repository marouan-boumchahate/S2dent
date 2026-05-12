import { Router } from 'express';
import { validate } from '../../middlewares/validate.middleware.js';
import { createDepartmentSchema, updateDepartmentSchema } from './department.validator.js';
import {
  createDepartmentController,
  listDepartmentsController,
  getDepartmentByIdController,
  updateDepartmentController,
  deleteDepartmentController,
} from './department.controller.js';
import authenticate from '../../middlewares/auth.middleware.js';
import requireRole from '../../middlewares/role.middleware.js';

const router = Router();

router.get(
  '/',
  authenticate,
  requireRole('academy'),
  listDepartmentsController,
);

router.get(
  '/:id',
  authenticate,
  requireRole('academy', 'professor', 'student'),
  getDepartmentByIdController,
);

router.post(
  '/',
  authenticate,
  requireRole('academy'),
  validate(createDepartmentSchema),
  createDepartmentController,
);

router.put(
  '/:id',
  authenticate,
  requireRole('academy'),
  validate(updateDepartmentSchema),
  updateDepartmentController,
);

router.delete(
  '/:id',
  authenticate,
  requireRole('academy'),
  deleteDepartmentController,
);

export default router;

