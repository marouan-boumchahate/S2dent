import { Router } from 'express';
import { validate } from '../../middlewares/validate.middleware.js';
import { createProfessorSchema, updateProfessorSchema } from './professor.validator.js';
import { createProfessorController, updateProfessorController } from './professor.controller.js';
 
const router = Router();

router.post(
  '/',
  validate(createProfessorSchema),
  createProfessorController,
);

router.put(
  '/:id',
  validate(updateProfessorSchema),
  updateProfessorController,
);
 
export default router;