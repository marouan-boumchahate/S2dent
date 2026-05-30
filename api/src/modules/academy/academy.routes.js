import { Router } from 'express';
import { validate } from '../../middlewares/validate.middleware.js';
import authenticate from '../../middlewares/auth.middleware.js';
import requireRole from '../../middlewares/role.middleware.js';
import { createAcademySchema, updateAcademySchema } from './academy.validator.js';
import {
  createAcademyController,
  getAllAcademiesController,
  getAcademyByIdController,
  getAcademySummaryController,
  getMyAcademyController,
  updateAcademyController,
} from './academy.controller.js';
 
const router = Router();


router.get(
  '/',
  authenticate,
  requireRole('admin'),
  getAllAcademiesController,
);
router.get(
  '/me',
  authenticate,
  requireRole('academy'),
  getMyAcademyController,
);
router.get(
  '/summary',
  authenticate,
  requireRole('professor', 'student'),
  getAcademySummaryController,
)
router.get(
  '/:id',
  authenticate,
  requireRole('admin'),
  getAcademyByIdController,
);
router.post(
  '/',
  authenticate,
  requireRole('admin'),
  validate(createAcademySchema),
  createAcademyController,
);
router.put(
  '/me',
  authenticate,
  requireRole('academy'),
  validate(updateAcademySchema),
  updateAcademyController,
);
 

export default router;