import Joi from 'joi';

const createAddressSchema = Joi.object({
  user_id: Joi.string().uuid().optional().allow(null, ''),
  academy_id: Joi.string().uuid().optional().allow(null, ''),
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

const updateAddressSchema = Joi.object({
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

export { createAddressSchema, updateAddressSchema };
