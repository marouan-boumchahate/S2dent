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

const router = Router();

router.get(
  '/',
  listDepartmentsController,
);

router.get(
  '/:id',
  getDepartmentByIdController,
);

router.post(
  '/',
  validate(createDepartmentSchema),
  createDepartmentController,
);

router.put(
  '/:id',
  validate(updateDepartmentSchema),
  updateDepartmentController,
);

router.delete(
  '/:id',
  deleteDepartmentController,
);

export default router;

