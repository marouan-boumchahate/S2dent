import Joi from 'joi';

const addressPattern = /^0x[a-fA-F0-9]{40}$/;

const generateNonceSchema = Joi.object({
  wallet_address: Joi.string().pattern(addressPattern).required(),
});

const verifySignatureSchema = Joi.object({
  wallet_address: Joi.string().pattern(addressPattern).required(),
  signature: Joi.string().length(132).required(),
});

const verifyAdminSignatureSchema = Joi.object({
  signature: Joi.string().length(132).required(),
});

const refreshTokenSchema = Joi.object({
  refresh_token: Joi.string().required(),
});

const sendOtpSchema = Joi.object({
  email: Joi.string().email().required(),
});

export { generateNonceSchema, verifySignatureSchema, verifyAdminSignatureSchema, refreshTokenSchema, sendOtpSchema };