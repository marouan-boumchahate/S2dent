import { issueStudentIdentityService } from './student.identity.service.js'
import { ok } from '../../../utils/response.js'

export const issueIdentity = async (req, res) => {
    const { wallet_address, email } = req.body

    const result = await issueStudentIdentityService({ 
        wallet_address: wallet_address.toLowerCase(),
        email: email.toLowerCase()
    })

    return ok(res, result, 'Student identity issuance request submitted successfully')
}