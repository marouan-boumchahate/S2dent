import { Router } from 'express';
import { validate } from '../../middlewares/validate.middleware.js';
import { createAddressSchema, updateAddressSchema } from './address.validator.js';
import { 
  createAddressController, 
  updateAddressController, 
  getUserAddressController, 
  getAddressController
} from './address.controller.js';
import authenticate from '../../middlewares/auth.middleware.js';
import requireRole from '../../middlewares/role.middleware.js';

const router = Router();

router.post(
  '/',
  authenticate,
  requireRole('academy', 'admin'),
  validate(createAddressSchema),
  createAddressController,
);
router.put(
  '/',
  authenticate,
  requireRole('academy', 'professor', 'student'),
  validate(updateAddressSchema),
  updateAddressController,
);
router.get(
  '/',
  authenticate,
  requireRole('academy', 'professor', 'student'),
  getUserAddressController
);
// router.get(
//   '/:id',
//   authenticate,
//   requireRole('academy', 'admin'),
//   getAddressController
// )

export default router;
