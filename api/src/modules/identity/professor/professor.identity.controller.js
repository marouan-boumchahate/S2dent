import { issueProfessorIdentityService, revokeProfessorIdentityService } from './professor.identity.service.js'
import { ok } from '../../../utils/response.js'

export const issueIdentity = async (req, res) => {
    const { wallet_address, email } = req.body

    const result = await issueProfessorIdentityService({ 
        wallet_address: wallet_address.toLowerCase(),
        email: email.toLowerCase()
    })

    return ok(res, result, 'Professor identity issuance request submitted successfully')
}

export const revokeIdentity = async (req, res) => {
    const { academy_address, professor_address } = req.body

    const result = await revokeProfessorIdentityService({ 
        academy_address: academy_address.toLowerCase(),
        professor_address: professor_address.toLowerCase()
    })

    return ok(res, result, 'Professor identity revocation request submitted successfully')
}