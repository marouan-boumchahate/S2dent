import { Router } from 'express';
import { validate } from '../../middlewares/validate.middleware.js';
import { createAcademySchema } from './academies.validator.js';
import { createAcademy } from './academies.controller.js';
 
const router = Router();

router.post(
  '/',
  validate(createAcademySchema),
  createAcademy,
);
 
export default router;