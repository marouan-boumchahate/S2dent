import { ethers, recoverAddress } from 'ethers';
import db from '../../config/db.js';
import { env } from '../../config/env.js';
import { issueCredential, revokeCredential, getCredential } from '../../blockchain/credential.blockchain.js';
import { listenOnTransaction } from '../../blockchain/listener.js';
import { hash, recoverSignerFromTypedData, encryptWithPublicKey } from '../../utils/crypto.js';
import { get } from 'http';


// DTOs
const credentialSummaryDTO = (credential) => ({
    id: credential.id,
    title: credential.title,
    code: credential.code,
    type: credential.type,
    student_name: credential.student_name,
    issued_at: credential.issued_at,
    is_revoked: credential.revoked_at !== null,
    status: credential.status
});
const credentialDTO = (credential) => ({
    meta: {
        id: credential.id,
        title: credential.title,
        code: credential.code,
        type: credential.type,
        description: credential.description,
        locale: credential.locale,
        issued_at: credential.issued_at,
        is_revoked: credential.revoked_at !== null,
    },
    student: {
        address: credential.student_address,
        name: credential.student_name,
    },
    blockchain: {
        issue_tx_hash: credential.issue_tx_hash,
        revoke_tx_hash: credential.revoke_tx_hash,
        revocation_reason: credential.revocation_reason,
        credential_index: credential.credential_index,
        academy_address: credential.academy_address,
        issuer_address: credential.issuer_address,
    },
    verification: {
        payload_hash: credential.payload_hash,
        signature: credential.signature,
    },
    payload: credential.payload
});
const studentCredentialDTO = (credential) => ({
    meta: {
        id: credential.id,
        title: credential.title,
        code: credential.code,
        type: credential.type,
        description: credential.description,
        locale: credential.locale,
        issued_at: credential.issued_at,
        is_revoked: credential.revoked_at !== null,
    },
    student: {
        address: credential.student_address,
        name: credential.student_name,
    },
    blockchain: {
        issue_tx_hash: credential.issue_tx_hash,
        revoke_tx_hash: credential.revoke_tx_hash,
        revocation_reason: credential.revocation_reason,
        credential_index: credential.credential_index,
        academy_address: credential.academy_address,
        issuer_address: credential.issuer_address,
    },
    verification: {
        payload_hash: credential.payload_hash,
        signature: credential.signature,
    },
    encryptedPayload: credential.encrypted_payload
});


// constants
const blockchainConfig = env.blockchain;

const ISSUE_ON_SUCCESS = {
    subject: 'Credential Issuance Confirmed',
    message: 'Your credential issuance has been confirmed on-chain and is now active in S2dent.'
};
const ISSUE_ON_FAILURE = {
    subject: 'Credential Issuance Pending Resolution',
    message: 'We encountered a temporary issue while confirming your credential issuance transaction. Our team is reviewing it and will resolve it shortly.'
};

const REVOKE_ON_SUCCESS = {
    subject: 'Credential Revocation Confirmed',
    message: 'Your credential has been successfully revoked on-chain and is no longer active in S2dent.'
};
const REVOKE_ON_FAILURE = {
    subject: 'Credential Revocation Pending Resolution',
    message: 'We encountered a temporary issue while processing your credential revocation transaction. Our team is reviewing it and will resolve it shortly.'
};


// Helpers
const canIssueTargetCredentialType = (issuerRole, credentialType) => {
    if(issuerRole === 'professor' && credentialType !== 'attendance') {
        const err = new Error('Professors can only issue attendance credentials');
        err.statusCode = 400;
        err.code = 'INVALID_CREDENTIAL_TYPE_FOR_PROFESSOR';
        throw err;
    }

    if(issuerRole === 'academy' && credentialType === 'attendance') {
        const err = new Error('Academies cannot issue attendance credentials'); 
        err.statusCode = 400;
        err.code = 'INVALID_CREDENTIAL_TYPE_FOR_ACADEMY';
        throw err;
    }
}
const getStudentAndAcademyData = async (student_address) => {
    const { rows: [identity] } = await db.query(
        `SELECT s.academy_id, s.advisor_id, u.full_name AS student_name, a.name AS academy_name, ai.wallet_address AS academy_wallet_address
         FROM identities i
         JOIN students s ON i.user_id = s.user_id
         JOIN users u ON s.user_id = u.id
         JOIN academies a ON s.academy_id = a.id
         JOIN identities ai ON ai.academy_id = s.academy_id AND ai.role = 'academy' AND ai.issued_at IS NOT NULL AND ai.revoked_at IS NULL
         WHERE LOWER(i.wallet_address) = LOWER($1) AND i.role = 'student' AND i.issued_at IS NOT NULL AND i.revoked_at IS NULL AND ai.issued_at IS NOT NULL AND ai.revoked_at IS NULL
         LIMIT 1`,
        [student_address]
    );

    if (!identity) {
        const err = new Error('Student identity not registered or inactive');
        err.statusCode = 404;
        err.code = 'STUDENT_NOT_FOUND';
        throw err;
    }

    return {
        academyId: identity.academy_id,
        academyAddress: identity.academy_wallet_address,
        academyName: identity.academy_name,
        advisorId: identity.advisor_id,
        studentAddress: student_address,
        studentName: identity.student_name
    };
}
const validateProfessorExistence = async (professorAddress, academyId) => {
    const { rows: [identity] } = await db.query(
        `SELECT 1
         FROM identities i
         JOIN professors p ON i.user_id = p.user_id
         WHERE LOWER(i.wallet_address) = LOWER($1) AND i.role = 'professor' AND i.issued_at IS NOT NULL AND i.revoked_at IS NULL AND p.academy_id = $2`,
        [professorAddress, academyId]
    );

    if (!identity) {
        const err = new Error('Professor identity not registered or inactive for the specified academy');
        err.statusCode = 401;
        err.code = 'UNAUTHORIZED_ISSUER';
        throw err;
    }
}

const generateCredentialCode = async () => {
    const result = await db.query(`SELECT nextval('credential_seq')`);
    const seq = result.rows[0].nextval;

    const now = new Date();
    const date = now.toISOString().slice(2,10).replace(/-/g,'');

    const credentialCode = `CRD_${date}${seq}`;

    return credentialCode;
}
const ensureUniqueCredentialCode = async (code) => {
    const { rows } = await db.query(
        `SELECT id FROM credentials WHERE code = $1`,
        [code]
    );

    if (rows.length > 0) {
        const err = new Error('Generated credential code already exists. Please try again.');
        err.statusCode = 500;
        err.code = 'CREDENTIAL_CODE_CONFLICT';
        throw err;
    }
};

const getPayloadHash = (payload) => {
    const payloadJson = JSON.stringify(payload, Object.keys(payload).sort());
    return hash(payloadJson);
};
const saveTransaction = async (txHash, payloadObj) => {
    const payload = JSON.stringify(payloadObj);

    await db.query(
        `INSERT INTO pending_transactions (tx_hash, payload)
        VALUES ($1, $2)`,
        [txHash, payload]
    );
};
const insertCredentialToDB = async (data) => {
    const {
        title,
        credentialCode,
        credential_type,
        description,
        academyAddress,
        issuerAddress,
        studentAddress,
        payload,
        payloadHash
    } = data;

    const { rows: [insertedCredential] } = await db.query(
        `INSERT INTO credentials (
            title,
            code,
            type,
            description,
            authorizer_wallet_address,
            issuer_wallet_address,
            student_wallet_address,
            payload,
            payload_hash
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id, code, payload_hash`,
        [
            title,
            credentialCode,
            credential_type,
            description || null,
            academyAddress,
            issuerAddress,
            studentAddress,
            payload,
            payloadHash,
        ]
    );

    return insertedCredential;
};
const updateCredential = async (credentialId, data) => {
    const {
        signature,
        encryptedPayload,
        issue_tx_hash,
        revoke_tx_hash
    } = data;

    await db.query(
        `UPDATE credentials
         SET signature = COALESCE($2, signature), encrypted_payload = COALESCE($3, encrypted_payload), 
             issue_tx_hash = COALESCE($4, issue_tx_hash), 
             revoke_tx_hash = COALESCE($5, revoke_tx_hash), 
             updated_at = NOW()
         WHERE id = $1`,
        [credentialId, signature, encryptedPayload, issue_tx_hash, revoke_tx_hash]
    );
};
const getCredentialSigningData = (credential) => {
    const chainId = blockchainConfig.chainId || 31337;
    const verifyingContract = blockchainConfig.deployedContractAddress;

    const {
        credentialId,
        title,
        code,
        type,
        academyAddress,
        academyName,
        issuerAddress,
        studentAddress,
        studentName,
        payloadHash
    } = credential;

    const signingData = {
        domain: {
            name: "S2dent",
            version: "1",
            chainId: parseInt(chainId),
            verifyingContract: verifyingContract,
        },
        types: {
            Credential: [
                { name: "credentialIdHash", type: "bytes32" },
                { name: "title", type: "string"  },
                { name: "code", type: "string"  },
                { name: "credentialType", type: "string"  },
                { name: "authorizerWalletAddress", type: "address" },
                { name: "authorizerName", type: "string"  },
                { name: "issuerWalletAddress", type: "address" },
                { name: "studentWalletAddress", type: "address" },
                { name: "studentName", type: "string"  },
                { name: "payloadHash", type: "bytes32" },
            ],
        },
        message: {
            credentialIdHash: hash(credentialId),
            title: title,
            code: code,
            credentialType: type,
            authorizerWalletAddress: academyAddress,
            authorizerName: academyName,
            issuerWalletAddress: issuerAddress,
            studentWalletAddress: studentAddress,
            studentName: studentName,
            payloadHash: payloadHash,
        },
    };

    return signingData;
}   

const fetchCredentialByIdForIssuance = async (credentialId) => {
    const { rows: [credential] } = await db.query(
        `SELECT c.id, c.title, c.code, c.type, c.description, 
                c.authorizer_wallet_address, c.issuer_wallet_address, c.student_wallet_address, 
                c.payload_hash, c.payload,
                ii.public_key AS student_public_key,
                a.name AS academy_name,
                u.full_name AS student_name,
                u.email AS student_email
         FROM credentials c
         JOIN identities i ON LOWER(c.authorizer_wallet_address) = LOWER(i.wallet_address) AND i.role = 'academy' AND i.issued_at IS NOT NULL AND i.revoked_at IS NULL
         JOIN academies a ON i.academy_id = a.id
         JOIN identities ii ON LOWER(c.student_wallet_address) = LOWER(ii.wallet_address) AND ii.role = 'student' AND ii.issued_at IS NOT NULL AND ii.revoked_at IS NULL
         JOIN users u ON ii.user_id = u.id
         WHERE c.id = $1 AND c.revoked_at IS NULL AND c.issued_at IS NULL`,
        [credentialId]
    );

    if (!credential) {
        const err = new Error('Credential not found or associated identities are inactive');
        err.statusCode = 404;
        err.code = 'CREDENTIAL_NOT_FOUND_OR_INACTIVE_IDENTITIES';
        throw err;
    }

    return credential;
}
const fetchCredentialByIdForRevocation = async (credentialId) => {
    const { rows: [credential] } = await db.query(
        `SELECT c.authorizer_wallet_address, c.student_wallet_address, c.credential_index, c.code, u.email AS student_email
         FROM credentials c
         JOIN identities i ON LOWER(c.student_wallet_address) = LOWER(i.wallet_address) AND i.role = 'student' AND i.issued_at IS NOT NULL AND i.revoked_at IS NULL
         JOIN users u ON u.id = i.user_id
         WHERE c.id = $1 AND (c.issued_at IS NOT NULL OR c.issue_tx_hash IS NOT NULL) AND c.revoked_at IS NULL`,
        [credentialId]
    );

    if (!credential) {
        const err = new Error('Credential not found');
        err.statusCode = 404;
        err.code = 'CREDENTIAL_NOT_FOUND';
        throw err;
    }

    return credential;
}
const validateIssuerIdentity = async (wallet_address) => {
    const { rows: [identity] } = await db.query(
        `SELECT 1 
         FROM identities 
         WHERE LOWER(wallet_address) = LOWER($1) AND issued_at IS NOT NULL AND revoked_at IS NULL`,
        [wallet_address]
    );

    if (!identity) {
        const err = new Error(`Issuer identity not registered or inactive`);
        err.statusCode = 401;
        err.code = 'UNAUTHORIZED_ISSUER';
        throw err;
    }
}
const validateSignature = async (credential, signature) => {
    const signingData = getCredentialSigningData({
        credentialId: credential.id,
        title: credential.title,
        code: credential.code,
        type: credential.type,
        academyAddress: credential.authorizer_wallet_address,
        academyName: credential.academy_name,
        issuerAddress: credential.issuer_wallet_address,
        studentAddress: credential.student_wallet_address,
        studentName: credential.student_name,
        payloadHash: credential.payload_hash
    });

    const recoveredAddress = recoverSignerFromTypedData(signingData.domain, signingData.types, signingData.message, signature);

    if (recoveredAddress.toLowerCase() !== credential.issuer_wallet_address.toLowerCase()) {
        const err = new Error('Invalid signature for the provided credential data');
        err.statusCode = 400;
        err.code = 'INVALID_SIGNATURE';
        throw err;
    }

    return true;
};
const compareTwoAddresses = (revokerAddress, academyAddress, errMsg, errCode) => {
    if(revokerAddress.toLowerCase() !== academyAddress.toLowerCase()) {
        const err = new Error(errMsg);
        err.statusCode = 403;
        err.code = errCode;
        throw err;
    }
}

const getCredentialById = async (credential_id) => {
    const { rows: [credential] } = await db.query(
        `SELECT c.id, c.title, c.code, c.type,
                c.student_wallet_address as student_address, u.full_name as student_name,
                c.authorizer_wallet_address as academy_address, a.name as academy_name,
                c.issuer_wallet_address as issuer_address, c.payload_hash
         FROM credentials c
         JOIN identities i ON c.student_wallet_address = i.wallet_address AND i.role = 'student'
         JOIN identities i2 ON c.authorizer_wallet_address = i2.wallet_address
         JOIN academies a ON i2.academy_id = a.id
         JOIN users u ON i.user_id = u.id
         WHERE c.id = $1`,
        [credential_id]
    );

    if (!credential) {
        const err = new Error('Credential not found');
        err.statusCode = 404;
        err.code = 'CREDENTIAL_NOT_FOUND';
        throw err;
    }

    return credential;
};
const getExactCredential = async (credential_id, wallet_address, role) => {
    let whereClause;
    switch(role) {
        case 'student':
            whereClause = 'WHERE c.id = $1 AND LOWER(c.student_wallet_address) = LOWER($2)';
            break;
        case 'academy':
            whereClause = 'WHERE c.id = $1 AND LOWER(c.authorizer_wallet_address) = LOWER($2)';
            break;
        case 'professor':
            whereClause = 'WHERE c.id = $1 AND LOWER(c.issuer_wallet_address) = LOWER($2)';
            break;
        default:
            const err = new Error('Invalid role for credential access');
            err.statusCode = 400;
            err.code = 'INVALID_ROLE';
            throw err;
    }

    const { rows: [credential] } = await db.query(
        `SELECT c.id, c.title, c.code,
                c.type, c.description, c.locale,
                c.student_wallet_address as student_address, u.full_name as student_name,
                c.issue_tx_hash, c.revoke_tx_hash, c.authorizer_wallet_address as academy_address,
                c.credential_index, c.payload,
                i2.public_key as issuer_public_key
         FROM credentials c
         JOIN identities i ON c.student_wallet_address = i.wallet_address AND i.role = 'student'
         JOIN identities i2 ON c.issuer_wallet_address = i2.wallet_address
         JOIN users u ON i.user_id = u.id
         ${whereClause}`,
        [credential_id, wallet_address]
    );

    if (!credential) {
        const err = new Error('Credential not found');
        err.statusCode = 404;
        err.code = 'CREDENTIAL_NOT_FOUND';
        throw err;
    }

    return credential;
};
const isPayloadTamperedWith = (payload, payloadHash) => {
    const computedHash = getPayloadHash(payload);

    if(computedHash !== payloadHash) {
        const err = new Error('Credential payload has been tampered with. Data integrity cannot be verified.');
        err.statusCode = 500;
        err.code = 'CREDENTIAL_DATA_INTEGRITY_ERROR';
        throw err;
    }
};
const getAllCredentials = async (wallet_address, role) => {
    let whereClause;
    switch(role) {
        case 'student':
            whereClause = 'WHERE LOWER(c.student_wallet_address) = LOWER($1) AND c.issued_at IS NOT NULL';
            break;
        case 'academy':
            whereClause = 'WHERE LOWER(c.authorizer_wallet_address) = LOWER($1)';
            break;
        case 'professor':
            whereClause = 'WHERE LOWER(c.issuer_wallet_address) = LOWER($1)';
            break;
        default:
            const err = new Error('Invalid role for credential access');
            err.statusCode = 400;
            err.code = 'INVALID_ROLE';
            throw err;
    }

    const { rows: credentials } = await db.query(`
        SELECT c.id, c.title, c.code, c.type,
               u.full_name as student_name,
               c.issued_at, c.revoked_at, pt.status
        FROM credentials c
        JOIN pending_transactions pt ON COALESCE(c.revoke_tx_hash, c.issue_tx_hash) = pt.tx_hash
        JOIN identities i ON c.student_wallet_address = i.wallet_address AND i.role = 'student' AND i.issued_at IS NOT NULL AND i.revoked_at IS NULL
        JOIN users u ON i.user_id = u.id
        ${whereClause}`,
        [wallet_address]
    );

    return credentials;
}
const isStudentAdvisor = async (issuerAddress, advisorId) => {
    const { rows: [professor] } = await db.query(
        `SELECT p.id
            FROM identities i
            JOIN professors p ON i.user_id = p.user_id
            WHERE LOWER(i.wallet_address) = LOWER($1)
            AND i.role = 'professor'`,
        [issuerAddress]
    );

    if (!professor || !advisorId || professor.id !== advisorId) {
        const err = new Error('Professor is not the student advisor');
        err.statusCode = 403;
        err.code = 'NOT_STUDENT_ADVISOR';
        throw err;
    }
}


// Services
const createCredentialService = async (issuer_address, role, data) => {
    const {
        title,
        credential_type,
        description,
        student_address,
        payload
    } = data;

    canIssueTargetCredentialType(role, credential_type);

    const checksumStudentAddr = ethers.getAddress(student_address);
    const {
        academyId,
        academyAddress,
        academyName,
        advisorId,
        studentAddress,
        studentName
    } = await getStudentAndAcademyData(checksumStudentAddr);

    const checksumIssuerAddr = ethers.getAddress(issuer_address);
    if(checksumIssuerAddr !== academyAddress) await validateProfessorExistence(checksumIssuerAddr, academyId);
    if (role === 'professor') await isStudentAdvisor(checksumIssuerAddr, advisorId);

    const credentialCode = await generateCredentialCode();
    await ensureUniqueCredentialCode(credentialCode);

    const payloadHash = getPayloadHash(payload);

    const insertedCredential = await insertCredentialToDB({
        title,
        credentialCode,
        credential_type,
        description,
        academyAddress,
        issuerAddress: checksumIssuerAddr,
        studentAddress: checksumStudentAddr,
        payload,
        payloadHash
    });

    const signingData = getCredentialSigningData({
        credentialId: insertedCredential.id,
        title,
        code: credentialCode,
        type: credential_type,
        academyAddress,
        academyName,
        issuerAddress: checksumIssuerAddr,
        studentAddress: checksumStudentAddr,
        studentName,
        payloadHash
    });

    return { credential_id: insertedCredential.id, signing_data: signingData };
};
const issueCredentialService = async (issuer_address, credential_id, signature) => {
    const credential = await fetchCredentialByIdForIssuance(credential_id);

    const checksumIssuerAddr = ethers.getAddress(issuer_address);
    compareTwoAddresses(
        checksumIssuerAddr, 
        credential.issuer_wallet_address, 
        'Only the issuer can issue this credential', 
        'FORBIDDEN_ISSUANCE'
    );

    if(checksumIssuerAddr !== credential.authorizer_wallet_address)
        await validateIssuerIdentity(checksumIssuerAddr);

    await validateSignature(credential, signature);
    const encryptedPayload = await encryptWithPublicKey(credential.payload, credential.student_public_key);
    
    
    const tx = await issueCredential({
        studentAddress: credential.student_wallet_address,
        issuerAddress: credential.issuer_wallet_address,
        academyAddress: credential.authorizer_wallet_address,
        title: credential.title,
        code: credential.code,
        credentialType: credential.type,
        description: credential.description || '',
        payloadHash: credential.payload_hash,
        signature: signature,
        encryptedPayload
    });

    await updateCredential(credential.id, { signature, encryptedPayload, issue_tx_hash: tx.hash });

    const pendingPayload = {
        action: 'credential_issue',
        credential_code: credential.code,
        wallet_address: credential.student_wallet_address,
        email: credential.student_email,
        onSuccess: ISSUE_ON_SUCCESS,
        onFailure: ISSUE_ON_FAILURE
    };

    await saveTransaction(tx.hash, pendingPayload);

    //console.log('Credential issuance transaction:', pendingPayload);
    listenOnTransaction(tx);

    return {
        credential_id: credential.id,
        credential_code: credential.code,
        blockchain_transaction: {
            tx_hash: tx.hash,
            status: 'pending'
        }
    };
};
const revokeCredentialService = async (revoker_address, credential_id, reason) => {
    const { 
        credential_index: credentialIndex,
        authorizer_wallet_address: academyAddress, 
        student_wallet_address: studentAddress,
        code: credentialCode,
        student_email: studentEmail
    } = await fetchCredentialByIdForRevocation(credential_id);

    const checksumRevokerAddr = ethers.getAddress(revoker_address);
    compareTwoAddresses(
        checksumRevokerAddr, 
        academyAddress, 
        'Only the academy can revoke this credential', 
        'FORBIDDEN_REVOCATION'
    );

    //console.log('Revoking credential with index:', credentialIndex.toString(), 'for student:', studentAddress, 'by revoker:', checksumRevokerAddr);
    const tx = await revokeCredential({
        studentAddress,
        credentialIndex,
        revokerAddress: academyAddress,
        reason
    });

    await updateCredential(credential_id, { revoke_tx_hash: tx.hash });

    const pendingPayload = {
        action: 'credential_revoke',
        credential_code: credentialCode,
        revocation_reason: reason,
        wallet_address: studentAddress,
        email: studentEmail,
        onSuccess: REVOKE_ON_SUCCESS,
        onFailure: REVOKE_ON_FAILURE
    };

    await saveTransaction(tx.hash, pendingPayload);

    listenOnTransaction(tx);

    return {
        credential_id,
        credential_code: credentialCode,
        blockchain_transaction: {
            tx_hash: tx.hash,
            status: 'pending'
        }
    };
}
const fetchCredentialService = async (credential_id, caller_address, role) => {
    const {
        id: credentialId,
        title,
        code,
        type,
        description,
        locale,
        student_address,
        student_name,
        issue_tx_hash,
        revoke_tx_hash,
        credential_index,
        issuer_public_key,
        payload: originalPayload
    } = await getExactCredential(credential_id, caller_address, role);

    const { identity, payload, signature, status } = await getCredential(student_address, credential_index);

    isPayloadTamperedWith(originalPayload, payload.payloadHash);

    const credential = {
        id: credentialId,
        title: title,
        code: code,
        type: type,
        description: description,
        locale: locale,
        issued_at: status.issuedAt,
        revoked_at: status.revokedAt,
        student_address: student_address,
        student_name: student_name,
        issue_tx_hash: issue_tx_hash,
        revoke_tx_hash: revoke_tx_hash,
        revocation_reason: status.revocationReason,
        credential_index: credential_index,
        academy_address: status.academyAddress,
        issuer_address: status.issuerAddress,
        payload_hash: payload.payloadHash,
        signature: signature,
        payload: originalPayload,
        encrypted_payload: payload.encryptedPayload,
    };

    return (role === 'student') 
        ? studentCredentialDTO(credential) 
        : credentialDTO(credential);
}
const fetchAllCredentialsService = async (wallet_address, role) => {
    const credentials = await getAllCredentials(wallet_address, role);
    return { 
        credentials: credentials.map(credential => 
            credentialSummaryDTO(credential)
        ) 
    };
}
const getCredentialSignatureSchemaService = async (credential_id) => {
    const credential = await getCredentialById(credential_id);

    const signature_schema = getCredentialSigningData({
        credentialId: credential.id,
        title: credential.title,
        code: credential.code,
        type: credential.type,
        academyAddress: credential.academy_address,
        academyName: credential.academy_name,
        issuerAddress: credential.issuer_address,
        studentAddress: credential.student_address,
        studentName: credential.student_name,
        payloadHash: credential.payload_hash
    });

    return { signature_schema };
}


export { 
    createCredentialService, 
    issueCredentialService, 
    revokeCredentialService, 
    fetchCredentialService,
    fetchAllCredentialsService,
    getCredentialSignatureSchemaService
};