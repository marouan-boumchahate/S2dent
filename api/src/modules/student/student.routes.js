import { Router } from 'express';
import { validate } from '../../middlewares/validate.middleware.js';
import { createStudentSchema } from './student.validator.js';
import { createStudentController } from './student.controller.js';
 
const router = Router();

router.post(
  '/',
  validate(createStudentSchema),
  createStudentController,
);
 
export default router;