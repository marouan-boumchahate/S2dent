import Joi from 'joi';

const GENDER_TYPES = [
  'male',
  'female',
];

const PHONE_REGEX = /^\+?[1-9]\d{7,14}$/;

const createStudentSchema = Joi.object({
  academy_id: Joi.string().uuid().required(),

  first_name: Joi.string().trim().max(100).required(),
  middle_name: Joi.string().trim().max(100).optional(),
  last_name: Joi.string().trim().max(100).required(),

  date_of_birth: Joi.date().iso().required(),
  gender: Joi.string().valid(...GENDER_TYPES).required()
    .messages({
      'any.only': `gender must be one of: ${GENDER_TYPES.join(', ')}`,
    }),
  national_id: Joi.string().trim().max(100).required(),

  email: Joi.string().email().lowercase().trim().required(),
  phone: Joi.string().pattern(PHONE_REGEX).optional()
    .messages({
      'string.pattern.base': 'phone must be a valid international phone number',
    }),

  address: Joi.string().trim().optional(),
  city: Joi.string().trim().max(100).required(),
  country: Joi.string().trim().max(100).required(),

  department: Joi.string().trim().max(255).required(),
  faculty: Joi.string().trim().max(255).required(),
  current_level: Joi.string().trim().max(50).required(),
  actual_study_duration_in_years: Joi.number().integer().min(1).max(10).required(),

  actual_graduation_date: Joi.date().iso().optional(),

  photo_url: Joi.string().uri().trim().max(500).optional()
    .messages({
      'string.uri': 'photo_url must be a valid URL',
    }),
  notes: Joi.string().trim().optional(),
});

export { createStudentSchema };
