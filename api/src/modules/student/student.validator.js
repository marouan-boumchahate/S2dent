import Joi from 'joi';

const ENROLLMENT_STATUSES = [
  'active',
  'inactive',
  'suspended',
  'withdrawn',
  'graduated',
];

const createStudentSchema = Joi.object({
  user_id: Joi.string().uuid().required(),
  academy_id: Joi.string().uuid().required(),
  department_id: Joi.string().uuid().required(),

  current_level: Joi.string().trim().max(50).required(),

  enrollment_status: Joi.string().valid(...ENROLLMENT_STATUSES).optional(),
  enrollment_date: Joi.date().iso().optional(),
  actual_graduation_date: Joi.date().iso().optional(),
});

export { createStudentSchema };
