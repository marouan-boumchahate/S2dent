import Joi from 'joi';

const createDepartmentSchema = Joi.object({
  code: Joi.string().trim().max(50).required(),
  name: Joi.string().trim().max(255).required(),
  faculty: Joi.string().trim().max(255).required(),

  total_years: Joi.number().integer().min(1).max(10).required(),
  description: Joi.string().trim().optional().allow(null, ''),

  is_active: Joi.boolean().optional().allow(null, ''),
});

const updateDepartmentSchema = Joi.object({
  description: Joi.string().trim().optional().allow(null, ''),
}).min(1);

export { createDepartmentSchema, updateDepartmentSchema };
