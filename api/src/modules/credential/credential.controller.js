import { ok } from '../../utils/response.js';
import { createCredentialService, issueCredentialService } from './credential.service.js';

const createCredentialController = async (req, res, next) => {
    const { sub: issuer_address } = req.user;
    const {
        title,
        credential_type,
        description,
        student_address,
        payload
    } = req.body;


    const result = await createCredentialService(issuer_address, {
        title,
        credential_type,
        description,
        student_address,
        payload
    });

    return ok(res, result, 'Credential signing data generated successfully');
};
const issueCredentialController = async (req, res, next) => {
    const { sub: issuer_address } = req.user;
    const { id: credentialId } = req.params;
    const { signature } = req.body;

    const result = await issueCredentialService(issuer_address, credentialId, signature);

    return ok(res, result, 'Credential issued successfully');
};


export {
    createCredentialController,
    issueCredentialController
};

