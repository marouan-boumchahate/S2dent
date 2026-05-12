import { issueProfessorIdentityService, revokeProfessorIdentityService } from './professor.identity.service.js'
import { ok } from '../../../utils/response.js'


const issueIdentity = async (req, res) => {
    const { wallet_address, email } = req.body

    const result = await issueProfessorIdentityService({ 
        wallet_address,
        email: email.toLowerCase()
    })

    return ok(res, result, 'Professor identity issuance request submitted successfully')
}
const revokeIdentity = async (req, res) => {
    const { professor_address } = req.query
    const { sub: academy_address } = req.user

    const result = await revokeProfessorIdentityService({ 
        academy_address,
        professor_address
    })

    return ok(res, result, 'Professor identity revocation request submitted successfully')
}


export { issueIdentity, revokeIdentity }