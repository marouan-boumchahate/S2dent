import Joi from 'joi';

const ENROLLMENT_STATUSES = [
  'active',
  'inactive',
  'graduated',
];

const createStudentSchema = Joi.object({
  user_id: Joi.string().uuid().required(),
  academy_id: Joi.string().uuid().required(),
  department_id: Joi.string().uuid().required(),
  advisor_id: Joi.string().uuid().required(),

  enrollment_status: Joi.string().valid(...ENROLLMENT_STATUSES).optional(),
  enrollment_date: Joi.date().iso().optional(),
  actual_graduation_date: Joi.date().iso().optional(),
});

const updateStudentSchema = Joi.object({
  cgpa: Joi.number().precision(2).min(0).max(5).optional().allow(null, ''),
  advisor_id: Joi.string().uuid().optional().allow(null, ''),
});

export { createStudentSchema, updateStudentSchema };
