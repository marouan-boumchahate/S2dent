import { Router } from 'express';
import { validate } from '../../middlewares/validate.middleware.js';
import authenticate from '../../middlewares/auth.middleware.js';
import requireRole from '../../middlewares/role.middleware.js';
import { 
  createProfessorSchema, 
  updateProfessorSchema, 
  updateProfessorByAdminSchema 
} from './professor.validator.js';
import { 
  createProfessorController, 
  updateProfessorController, 
  updateProfessorByAdminController, 
  getProfessorByIdController,
  getMyProfileController,
  getAllProfessorsController
} from './professor.controller.js';
 
const router = Router();


router.get(
  '/',
  authenticate,
  requireRole('academy'),
  getAllProfessorsController,
);
router.get(
  '/me',
  authenticate,
  requireRole('professor'),
  getMyProfileController,
);
router.get(
  '/:id',
  authenticate,
  requireRole('academy'),
  getProfessorByIdController,
);
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