import Joi from 'joi'

const ETH_ADDRESS = /^0x[0-9a-fA-F]{40}$/

export const issueIdentitySchema = Joi.object({
    email: Joi.string().email().required(),
    otp: Joi.string().length(6).pattern(/^[A-Za-z0-9]+$/).required(),
    signature: Joi.string().length(132).required()
})

export const revokeIdentitySchema = Joi.object({
    professor_address: Joi.string().pattern(ETH_ADDRESS).required()
        .messages({
            'string.pattern.base': 'professor_address must be a valid Ethereum address (0x…)',
        }),
    revocation_reason: Joi.string().trim().min(1).required(),
})