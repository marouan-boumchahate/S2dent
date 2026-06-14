import Joi from 'joi';

const ENROLLMENT_STATUSES = [
  'active',
  'inactive',
  'graduated',
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

const createStudentSchema = Joi.object({
  user: userSchema.required(),
  address: addressSchema.required(),
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
