import Joi from 'joi';

const createStudentSchema = Joi.object({
  user_id: Joi.string().uuid().required(),
  academy_id: Joi.string().uuid().required(),
  department_id: Joi.string().uuid().required(),

  current_level: Joi.string().trim().max(50).required(),

  actual_graduation_date: Joi.date().iso().optional(),
});

export { createStudentSchema };
