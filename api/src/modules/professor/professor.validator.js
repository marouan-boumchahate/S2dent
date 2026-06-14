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

const userSchema = Joi.object({
  first_name: Joi.string().trim().max(100).required(),
  middle_name: Joi.string().trim().max(100).optional().allow(null, ''),
  last_name: Joi.string().trim().max(100).required(),
  date_of_birth: Joi.date().iso().max('now').required(),
  gender: Joi.string().valid('male', 'female').required(),
  nationality: Joi.string().trim().max(100).required(),
  national_id: Joi.string().trim().max(100).required(),
  email: Joi.string().email().lowercase().trim().required(),
  phone: Joi.string().pattern(/^\+?[1-9]\d{7,14}$/).optional().allow(null, ''),
  photo_url: Joi.string().uri().trim().max(500).optional().allow(null, '')
});

const addressSchema = Joi.object({
  address_line1: Joi.string().trim().max(255).optional().allow(null, ''),
  address_line2: Joi.string().trim().max(255).optional().allow(null, ''),
  street: Joi.string().trim().max(255).optional().allow(null, ''),
  district: Joi.string().trim().max(100).optional().allow(null, ''),
  state: Joi.string().trim().max(100).optional().allow(null, ''),
  postal_code: Joi.string().trim().max(20).optional().allow(null, ''),
  city: Joi.string().trim().max(100).required(),
  country: Joi.string().trim().max(100).required(),
  latitude: Joi.number().min(-90).max(90).optional().allow(null, ''),
  longitude: Joi.number().min(-180).max(180).optional().allow(null, ''),
});

const createProfessorSchema = Joi.object({
  user: userSchema.required(),
  address: addressSchema.required(),
  department_id: Joi.string().uuid().required(),

  title: Joi.string().trim().max(100).required(),
  rank: Joi.string()
    .valid(...professorRanks)
    .required(),
  specialization: Joi.string().trim().max(255).optional().allow(null, ''),
  hire_date: Joi.date().iso().max('now').optional().allow(null, ''),
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