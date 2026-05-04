import { issueAcademyIdentity, revokeAcademyIdentity } from './academy.identity.service.js'
import { ok } from '../../../utils/response.js'

export const issueIdentity = async (req, res) => {
  const { wallet_address } = req.body

  const result = await issueAcademyIdentity({ wallet_address: wallet_address.toLowerCase() })

  return ok(res, result, 'Academy identity issuance request submitted successfully')
}

export const revokeIdentity = async (req, res) => {
  const { wallet_address } = req.body

  const result = await revokeAcademyIdentity({ wallet_address: wallet_address.toLowerCase() })

  return ok(res, result, 'Academy identity revocation request submitted successfully')
}