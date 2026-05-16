import { issueAcademyIdentity, revokeAcademyIdentity } from './academy.identity.service.js'
import { ok } from '../../../utils/response.js'

export const issueIdentity = async (req, res) => {
  const { otp, email, signature } = req.body

  const result = await issueAcademyIdentity({ otp, email, signature })

  return ok(res, result, 'Academy identity issuance request submitted successfully')
}

export const revokeIdentity = async (req, res) => {
  const { wallet_address, revocation_reason } = req.body

  const result = await revokeAcademyIdentity({ wallet_address, reason: revocation_reason })

  return ok(res, result, 'Academy identity revocation request submitted successfully')
}