import { 
  issueAcademyIdentity, 
  revokeAcademyIdentity, 
  fetchAcademyIdentityByWalletService,
  fetchAcademyIdentityByIdService
} from './academy.identity.service.js'
import { ok } from '../../../utils/response.js'


const issueIdentity = async (req, res) => {
  const { otp, email, signature } = req.body

  const result = await issueAcademyIdentity({ otp, email, signature })

  return ok(res, result, 'Academy identity issuance request submitted successfully')
}
const revokeIdentity = async (req, res) => {
  const { wallet_address, revocation_reason } = req.body

  const result = await revokeAcademyIdentity({ wallet_address, reason: revocation_reason })

  return ok(res, result, 'Academy identity revocation request submitted successfully')
}
const getMyIdentity = async (req, res) => {
  const { sub: wallet_address } = req.user
  const result = await fetchAcademyIdentityByWalletService(wallet_address)

  return ok(res, result, 'Academy identity retrieved successfully')
}
const getIdentityByAddress = async (req, res) => {
  const { address } = req.params
  const result = await fetchAcademyIdentityByWalletService(address)

  return ok(res, result, 'Academy identity retrieved successfully')
}
const getIdentityById = async (req, res) => {
  const { id } = req.params
  const result = await fetchAcademyIdentityByIdService(id)

  return ok(res, result, 'Academy identity retrieved successfully')
}


export { issueIdentity, revokeIdentity, getMyIdentity, getIdentityByAddress, getIdentityById }