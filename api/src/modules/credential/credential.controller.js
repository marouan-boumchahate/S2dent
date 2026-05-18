import { ok } from '../../utils/response.js';
import { createCredentialService } from './credential.service.js';

export const issue = async (req, res, next) => {
    const { sub: issuer_address, role } = req.user;
    const {
        title,
        credential_type,
        description,
        student_address,
        payload
    } = req.body;


    const result = await createCredentialService(issuer_address, role, {
        title,
        credential_type,
        description,
        student_address,
        payload
    });

    return ok(res, result, 'Credential signing data generated successfully');
};
