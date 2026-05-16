import { issueProfessorIdentityService, revokeProfessorIdentityService } from './professor.identity.service.js'
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
    const { professor_address, revocation_reason } = req.query
    const { sub: academy_address } = req.user

    const result = await revokeProfessorIdentityService({ 
        academy_address,
        professor_address,
        reason: revocation_reason
    })

    return ok(res, result, 'Professor identity revocation request submitted successfully')
}


export { issueIdentity, revokeIdentity }