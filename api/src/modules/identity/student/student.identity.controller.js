import { issueStudentIdentityService, revokeStudentIdentityService } from './student.identity.service.js'
import { ok } from '../../../utils/response.js'

export const issueIdentity = async (req, res) => {
    const { otp, email, signature } = req.body

    const result = await issueStudentIdentityService({ 
        otp,
        signature,
        email
    })

    return ok(res, result, 'Student identity issuance request submitted successfully')
}
export const revokeIdentity = async (req, res) => {
    const { student_address, revocation_reason } = req.query
    const { sub: academy_address } = req.user

    const result = await revokeStudentIdentityService({  academy_address, student_address, reason: revocation_reason })

    return ok(res, result, 'Student identity revocation request submitted successfully')
}