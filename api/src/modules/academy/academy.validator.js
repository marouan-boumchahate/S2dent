import Joi from 'joi';

const ACADEMY_TYPES = [
  'university',
  'college',
  'school',
  'institute',
  'online_platform',
  'other',
];

const ETH_ADDRESS = /^0x[0-9a-fA-F]{40}$/;

const createAcademySchema = Joi.object({
  name: Joi.string().trim().min(3).max(255).required(),
  short_name: Joi.string().trim().max(50).required(),
  type: Joi.string().valid(...ACADEMY_TYPES).required()
    .messages({
      'any.only': `type must be one of: ${ACADEMY_TYPES.join(', ')}`,
    }),

  description: Joi.string().trim().max(5000).optional().allow(null, ''),
  website: Joi.string().uri().trim().optional().allow(null, '')
    .messages({
      'string.uri': 'website must be a valid URL (e.g. https://university.edu)',
    }),
  logo_url: Joi.string().uri().trim().optional().allow(null, '')
    .messages({
      'string.uri': 'logo_url must be a valid URL',
    }),

  email: Joi.string().email().lowercase().trim().required(),
  phone: Joi.string().trim().max(32).optional().allow(null, ''),

  legal_name: Joi.string().trim().max(255).required(),
  registration_number: Joi.string().trim().max(100).required(),
  tax_id: Joi.string().trim().max(100).required(),
  billing_email: Joi.string().email().lowercase().trim().optional().allow(null, ''),
});

const updateAcademySchema = Joi.object({
  description: Joi.string().trim().max(5000).optional().allow(null, ''),
  website: Joi.string().uri().trim().optional().allow(null, '')
    .messages({
      'string.uri': 'website must be a valid URL (e.g. https://university.edu)',
    }),
  logo_url: Joi.string().uri().trim().optional().allow(null, '')
    .messages({
      'string.uri': 'logo_url must be a valid URL',
    }),
  phone: Joi.string().trim().max(32).optional().allow(null, ''),
});

export { createAcademySchema, updateAcademySchema };