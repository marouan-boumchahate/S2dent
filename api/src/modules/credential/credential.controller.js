import { ok } from '../../utils/response.js';
import { 
    createCredentialService, 
    issueCredentialService,
    revokeCredentialService,
    fetchCredentialService,
    fetchAllCredentialsService
} from './credential.service.js';


const createCredentialController = async (req, res, next) => {
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
const issueCredentialController = async (req, res, next) => {
    const { sub: issuer_address } = req.user;
    const { id: credentialId } = req.params;
    const { signature } = req.body;

    const result = await issueCredentialService(issuer_address, credentialId, signature);

    return ok(res, result, 'Credential issued successfully');
};
const revokeCredentialController = async (req, res, next) => {
    const { sub: issuer_address } = req.user;
    const { id: credential_id } = req.params;
    const { reason } = req.body;

    const result = await revokeCredentialService(issuer_address, credential_id, reason);

    return ok(res, result, 'Credential revoked successfully');
};
const fetchCredentialController = async (req, res, next) => {
    const { sub, role } = req.user;
    const { id: credential_id } = req.params;

    const result = await fetchCredentialService( credential_id, sub, role);

    return ok(res, result, 'Credential fetched successfully');
};
const fetchAllCredentialsController = async (req, res, next) => {
    const { sub, role } = req.user;

    const result = await fetchAllCredentialsService(sub, role);

    return ok(res, result, 'Credentials fetched successfully');
};


export {
    createCredentialController,
    issueCredentialController,
    revokeCredentialController,
    fetchCredentialController,
    fetchAllCredentialsController
};