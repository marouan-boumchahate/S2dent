import { Router } from 'express';
import { validate } from '../../middlewares/validate.middleware.js';
import { createStudentSchema, updateStudentSchema } from './student.validator.js';
import {
  createStudentController,
  updateStudentController,
  getAllStudentsController,
  getMyProfileController,
  getStudentByIdController,
} from './student.controller.js';
import authenticate from '../../middlewares/auth.middleware.js';
import requireRole from '../../middlewares/role.middleware.js';
 
const router = Router();

router.get(
  '/',
  authenticate,
  requireRole('academy'),
  getAllStudentsController,
);
router.get(
  '/me',
  authenticate,
  requireRole('student'),
  getMyProfileController,
);
router.get(
  '/:id',
  authenticate,
  requireRole('academy'),
  getStudentByIdController,
);

router.post(
  '/',
  authenticate,
  requireRole('academy'),
  validate(createStudentSchema),
  createStudentController,
);
router.put(
  '/:id',
  authenticate,
  requireRole('academy'),
  validate(updateStudentSchema),
  updateStudentController,
);
 
export default router;