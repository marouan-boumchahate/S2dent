import Joi from 'joi';

const GENDER_TYPES = [
  'male',
  'female',
];

const PHONE_REGEX = /^\+?[1-9]\d{7,14}$/;

const createUserSchema = Joi.object({
  first_name: Joi.string().trim().max(100).required(),
  middle_name: Joi.string().trim().max(100).optional(),
  last_name: Joi.string().trim().max(100).required(),

  date_of_birth: Joi.date().iso().required(),
  gender: Joi.string().valid(...GENDER_TYPES).required()
    .messages({
      'any.only': `gender must be one of: ${GENDER_TYPES.join(', ')}`,
    }),
  nationality: Joi.string().trim().max(100).required(),

  national_id: Joi.string().trim().max(100).required(),
  email: Joi.string().email().lowercase().trim().required(),
  phone: Joi.string().pattern(PHONE_REGEX).optional()
    .messages({
      'string.pattern.base': 'phone must be a valid international phone number',
    }),

  photo_url: Joi.string().uri().trim().max(500).optional()
    .messages({
      'string.uri': 'photo_url must be a valid URL',
    })
});

const updateUserSchema = Joi.object({
  phone: Joi.string().pattern(PHONE_REGEX).optional().allow(null, '')
    .messages({
      'string.pattern.base': 'phone must be a valid international phone number',
    }),
  photo_url: Joi.string().uri().trim().max(500).optional().allow(null, '')
    .messages({
      'string.uri': 'photo_url must be a valid URL',
    })
}).min(1);

export { createUserSchema, updateUserSchema };
