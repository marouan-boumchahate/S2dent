import { Router } from 'express';
import { validate } from '../../middlewares/validate.middleware.js';
import { createDepartmentSchema } from './department.validator.js';
import { createDepartmentController } from './department.controller.js';

const router = Router();

router.post(
  '/',
  validate(createDepartmentSchema),
  createDepartmentController,
);

export default router;

