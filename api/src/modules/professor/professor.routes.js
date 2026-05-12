import { Router } from 'express';
import { validate } from '../../middlewares/validate.middleware.js';
import { createProfessorSchema, updateProfessorSchema, updateProfessorByAdminSchema } from './professor.validator.js';
import { createProfessorController, updateProfessorController, updateProfessorByAdminController } from './professor.controller.js';
import authenticate from '../../middlewares/auth.middleware.js';
import requireRole from '../../middlewares/role.middleware.js';
 
const router = Router();

router.post(
  '/',
  authenticate,
  requireRole('academy'),
  validate(createProfessorSchema),
  createProfessorController,
);

router.put(
  '/:id',
  authenticate,
  requireRole('academy'),
  validate(updateProfessorByAdminSchema),
  updateProfessorByAdminController,
);

router.put(
  '/',
  authenticate,
  requireRole('professor'),
  validate(updateProfessorSchema),
  updateProfessorController,
)
 
export default router;