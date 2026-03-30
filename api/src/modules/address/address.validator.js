import Joi from 'joi';

const createAddressSchema = Joi.object({
  address_line1: Joi.string().trim().max(255).optional(),
  address_line2: Joi.string().trim().max(255).optional(),
  street: Joi.string().trim().max(255).optional(),
  district: Joi.string().trim().max(100).optional(),
  state: Joi.string().trim().max(100).optional(),
  postal_code: Joi.string().trim().max(20).optional(),
  city: Joi.string().trim().max(100).required(),
  country: Joi.string().trim().max(100).required(),
  latitude: Joi.number().min(-90).max(90).optional(),
  longitude: Joi.number().min(-180).max(180).optional(),
});

export { createAddressSchema };
