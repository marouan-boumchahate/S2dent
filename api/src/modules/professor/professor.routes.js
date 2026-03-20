import { Router } from 'express';
import { validate } from '../../middlewares/validate.middleware.js';
import { createProfessorSchema } from './professor.validator.js';
import { createProfessorController } from './professor.controller.js';
 
const router = Router();

router.post(
  '/',
  validate(createProfessorSchema),
  createProfessorController,
);
 
export default router;