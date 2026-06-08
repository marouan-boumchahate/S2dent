import Joi from 'joi';

const ENROLLMENT_STATUSES = [
  'active',
  'inactive',
  'graduated',
];

const createStudentSchema = Joi.object({
  user_id: Joi.string().uuid().required(),
  department_id: Joi.string().uuid().required(),
  advisor_id: Joi.string().uuid().required(),

  enrollment_status: Joi.string().valid(...ENROLLMENT_STATUSES).optional().allow(null, ''),
  enrollment_date: Joi.date().iso().max('now').optional().allow(null, ''),
  actual_graduation_date: Joi.date().iso().optional().allow(null, '')
    .when('enrollment_date', {
      is: Joi.date().required(),
      then: Joi.date().min(Joi.ref('enrollment_date'))
    }),
});

const updateStudentSchema = Joi.object({
  cgpa: Joi.number().precision(2).min(0).max(100).optional().allow(null, ''),
  advisor_id: Joi.string().uuid().optional().allow(null, ''),
});

export { createStudentSchema, updateStudentSchema };
