import { 
    issueProfessorIdentityService, 
    revokeProfessorIdentityService, 
    fetchProfessorIdentityByWalletService,
    fetchProfessorIdentityByUserIdService 
} from './professor.identity.service.js'
import { ok } from '../../../utils/response.js'


const issueIdentity = async (req, res) => {
    const { otp, email, signature } = req.body

    const result = await issueProfessorIdentityService({ 
        otp,
        signature,
        email
    })

    return ok(res, result, 'Professor identity issuance request submitted successfully')
}
const revokeIdentity = async (req, res) => {
    const { professor_address, revocation_reason } = req.body
    const { sub: academy_address } = req.user

    const result = await revokeProfessorIdentityService({ 
        academy_address,
        professor_address,
        reason: revocation_reason
    })

    return ok(res, result, 'Professor identity revocation request submitted successfully')
}
const getMyIdentity = async (req, res) => {
    const result = await fetchProfessorIdentityByWalletService(req.user.sub)

    return ok(res, result, 'Professor identity retrieved successfully')
}
const getIdentityByAddress = async (req, res) => {
    const { address } = req.params
    const result = await fetchProfessorIdentityByWalletService(address)

    return ok(res, result, 'Professor identity retrieved successfully')
}
const getIdentityById = async (req, res) => {
    const { id } = req.params
    const result = await fetchProfessorIdentityByUserIdService(id)

    return ok(res, result, 'Professor identity retrieved successfully')
}


export { issueIdentity, revokeIdentity, getMyIdentity, getIdentityByAddress, getIdentityById }