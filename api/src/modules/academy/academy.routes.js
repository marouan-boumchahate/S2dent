import { Router } from 'express';
import { validate } from '../../middlewares/validate.middleware.js';
import authenticate from '../../middlewares/auth.middleware.js';
import requireRole from '../../middlewares/role.middleware.js';
import { createAcademySchema, updateAcademySchema } from './academy.validator.js';
import {
  createAcademyController,
  getAllAcademiesController,
  getAcademyByIdController,
  getMyAcademyController,
  updateAcademyController,
} from './academy.controller.js';
 
const router = Router();


router.get(
  '/',
  getAllAcademiesController,
);
router.get(
  '/me',
  authenticate,
  requireRole('academy'),
  getMyAcademyController,
);
router.get(
  '/:id',
  getAcademyByIdController,
);
router.post(
  '/',
  validate(createAcademySchema),
  createAcademyController,
);
router.put(
  '/:id',
  validate(updateAcademySchema),
  updateAcademyController,
);
 

export default router;