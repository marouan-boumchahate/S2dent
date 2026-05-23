import { 
    issueStudentIdentityService, 
    revokeStudentIdentityService, 
    fetchStudentIdentityByWalletService,
    fetchStudentIdentityByUserIdService 
} from './student.identity.service.js'
import { ok } from '../../../utils/response.js'

const issueIdentity = async (req, res) => {
    const { otp, email, signature } = req.body

    const result = await issueStudentIdentityService({ 
        otp,
        signature,
        email
    })

    return ok(res, result, 'Student identity issuance request submitted successfully')
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
    const result = await fetchStudentIdentityByUserIdService(id)

    return ok(res, result, 'Student identity retrieved successfully')
}

export { issueIdentity, revokeIdentity, getMyIdentity, getIdentityByAddress, getIdentityById }