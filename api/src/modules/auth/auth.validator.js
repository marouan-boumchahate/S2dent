import Joi from 'joi';

const addressPattern = /^0x[a-fA-F0-9]{40}$/;

const generateNonceSchema = Joi.object({
  address: Joi.string().pattern(addressPattern).required(),
});

const verifySignatureSchema = Joi.object({
  address: Joi.string().pattern(addressPattern).required(),
  signature: Joi.string().length(132).required(),
});

const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string().required(),
});

export { generateNonceSchema, verifySignatureSchema, refreshTokenSchema };