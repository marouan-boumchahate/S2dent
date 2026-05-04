import { issueStudentIdentityService, revokeStudentIdentityService } from './student.identity.service.js'
import { ok } from '../../../utils/response.js'

export const issueIdentity = async (req, res) => {
    const { wallet_address, email } = req.body

    const result = await issueStudentIdentityService({ 
        wallet_address: wallet_address.toLowerCase(),
        email: email.toLowerCase()
    })

    return ok(res, result, 'Student identity issuance request submitted successfully')
}

export const revokeIdentity = async (req, res) => {
    const { academy_address, student_address } = req.body

    const result = await revokeStudentIdentityService({ 
        academy_address: academy_address.toLowerCase(),
        student_address: student_address.toLowerCase()
    })

    return ok(res, result, 'Student identity revocation request submitted successfully')
}