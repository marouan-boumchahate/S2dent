import { Router } from 'express';
import { validate } from '../../middlewares/validate.middleware.js';
import { createStudentSchema, updateStudentSchema } from './student.validator.js';
import { createStudentController, updateStudentController } from './student.controller.js';
 
const router = Router();

router.post(
  '/',
  validate(createStudentSchema),
  createStudentController,
);

router.put(
  '/:id',
  validate(updateStudentSchema),
  updateStudentController,
);
 
export default router;