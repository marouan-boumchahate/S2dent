import Joi from 'joi';

const signingDataSchema = Joi.object({
  payload: Joi.object({
    domain: Joi.object().required(),
    types: Joi.object().required(),
    message: Joi.object().required(),
  }).required(),
  privateKey: Joi.string().required(),
});

export { signingDataSchema };