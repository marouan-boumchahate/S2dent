import Joi from 'joi';

const professorRanks = [
  'Assist. Prof',
  'Assoc. Prof',
  'Prof',
  'Lecturer',
  'Instructor'
];

const employmentTypes = [
  'full_time',
  'part_time',
  'adjunct',
  'visiting',
  'contract'
];

const createProfessorSchema = Joi.object({
  user_id: Joi.string().uuid().required(),
  department_id: Joi.string().uuid().required(),

  title: Joi.string().trim().max(100).required(),
  rank: Joi.string()
    .valid(...professorRanks)
    .required(),
  specialization: Joi.string().trim().max(255).optional().allow(null, ''),
  hire_date: Joi.date().iso().optional().allow(null, ''),
  employment_type: Joi.string()
    .valid(...employmentTypes)
    .default('full_time'),

  office_location: Joi.string().trim().max(255).optional().allow(null, ''),
  office_hours: Joi.string().trim().optional().allow(null, ''),

  bio: Joi.string().trim().optional().allow(null, '')
});

const updateProfessorSchema = Joi.object({
  bio: Joi.string().trim().optional().allow(null, ''),
}).min(1);

const updateProfessorByAdminSchema = Joi.object({
  rank: Joi.string().valid(...professorRanks).optional().allow(null, ''),
  employment_type: Joi.string().valid(...employmentTypes).optional().allow(null, ''),
  office_location: Joi.string().trim().max(255).optional().allow(null, ''),
  office_hours: Joi.string().trim().optional().allow(null, ''),
}).min(1);

export { createProfessorSchema, updateProfessorSchema, updateProfessorByAdminSchema };