import Joi from 'joi'

const ETH_ADDRESS = /^0x[0-9a-fA-F]{40}$/

export const issueIdentitySchema = Joi.object({
  wallet_address: Joi.string().pattern(ETH_ADDRESS).required()
    .messages({
      'string.pattern.base': 'wallet_address must be a valid Ethereum address (0x…)',
    }),
})

export const revokeIdentitySchema = Joi.object({
  wallet_address: Joi.string().pattern(ETH_ADDRESS).required()
    .messages({
      'string.pattern.base': 'wallet_address must be a valid Ethereum address (0x…)',
    }),
})