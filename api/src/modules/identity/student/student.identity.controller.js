import { 
    requestIdentityIssuanceService,
    generateIdentitySignatureSchemaService,
    issueStudentIdentityService, 
    revokeStudentIdentityService, 
    fetchStudentIdentityByWalletService,
    fetchStudentIdentityByUserIdService 
} from './student.identity.service.js'
import { ok } from '../../../utils/response.js'

const requestIdentityIssuanceController = async (req, res) => {
    const { otp, email, signature } = req.body

    const result = await requestIdentityIssuanceService({ 
        otp,
        signature,
        email
    })

    return ok(res, result, 'Student identity issuance request submitted successfully')
}
const generateIdentitySignatureSchemaController = async (req, res) => {
    const { wallet_address } = req.params
    const { rid: academy_id } = req.user

    const result = await generateIdentitySignatureSchemaService({ 
        wallet_address,
        academy_id
    })

    return ok(res, result, 'Student identity signature schema generated successfully')
}
const issueIdentityController = async (req, res) => {
    const { student_address, signature } = req.body
    const { rid: academy_id } = req.user

    const result = await issueStudentIdentityService({ 
        wallet_address: student_address,
        signature,
        academy_id
    })

    return ok(res, result, 'Student identity issued successfully')
}
const revokeIdentity = async (req, res) => {
    const { student_address, revocation_reason } = req.body
    const { sub: academy_address } = req.user

    const result = await revokeStudentIdentityService({  academy_address, student_address, reason: revocation_reason })

    return ok(res, result, 'Student identity revocation request submitted successfully')
}
const getMyIdentity = async (req, res) => {
    const result = await fetchStudentIdentityByWalletService(req.user.sub)

    return ok(res, result, 'Student identity retrieved successfully')
}
const getIdentityByAddress = async (req, res) => {
    const { address } = req.params
    const result = await fetchStudentIdentityByWalletService(address)

    return ok(res, result, 'Student identity retrieved successfully')
}
const getIdentityById = async (req, res) => {
    const { id } = req.params
    const { rid, role } = req.user
    
    const result = await fetchStudentIdentityByUserIdService({
        user_id: id,
        requester_id: rid,
        requester_role: role
    })

    return ok(res, result, 'Student identity retrieved successfully')
}

export { 
    requestIdentityIssuanceController,
    generateIdentitySignatureSchemaController,
    issueIdentityController,
    revokeIdentity, 
    getMyIdentity, 
    getIdentityByAddress, 
    getIdentityById 
}