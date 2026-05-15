import { issueAcademyIdentity, revokeAcademyIdentity } from './academy.identity.service.js'
import { ok } from '../../../utils/response.js'

export const issueIdentity = async (req, res) => {
  const { wallet, email } = req.body

  const result = await issueAcademyIdentity({ wallet, email })

  return ok(res, result, 'Academy identity issuance request submitted successfully')
}

export const revokeIdentity = async (req, res) => {
  const { wallet } = req.body

  const result = await revokeAcademyIdentity({ wallet })

  return ok(res, result, 'Academy identity revocation request submitted successfully')
}