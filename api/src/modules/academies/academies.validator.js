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
    email: Joi.string().email().lowercase().trim().required(),
    name: Joi.string().trim().min(3).max(255).required(),
    short_name: Joi.string().trim().max(50).optional(),
    type: Joi.string().valid(...ACADEMY_TYPES).required()
        .messages({
            'any.only': `type must be one of: ${ACADEMY_TYPES.join(', ')}`,
        }),
    country: Joi.string().trim().max(100).required(),
    city: Joi.string().trim().max(100).required(),
    address: Joi.string().trim().optional(),
    website: Joi.string().uri().trim().optional()
        .messages({
        'string.uri': 'website must be a valid URL (e.g. https://university.edu)',
        }),
    walletAddress: Joi.string().pattern(ETH_ADDRESS).required()
        .messages({
            'string.pattern.base': 'walletAddress must be a valid Ethereum address (0x…)',
        })
});

export { createAcademySchema };