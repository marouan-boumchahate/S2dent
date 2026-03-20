import { Router } from 'express';
import { validate } from '../../middlewares/validate.middleware.js';
import { createAcademySchema } from './academy.validator.js';
import { createAcademyController } from './academy.controller.js';
 
const router = Router();

router.post(
  '/',
  validate(createAcademySchema),
  createAcademyController,
);
 
export default router;