import { ethers, recoverAddress } from 'ethers';
import db from '../../config/db.js';
import { env } from '../../config/env.js';
import { issueCredential } from '../../blockchain/credential.blockchain.js';
import { listenOnTransaction } from '../../blockchain/listener.js';
import { hash, recoverSignerFromTypedData, encryptWithPublicKey } from '../../utils/crypto.js';


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

// Helpers
const getStudentAndAcademyData = async (student_address) => {
    const { rows: [identity] } = await db.query(
        `SELECT s.academy_id, u.full_name AS student_name, a.name AS academy_name, ai.wallet_address AS academy_wallet_address
         FROM identities i
         JOIN students s ON i.user_id = s.user_id
         JOIN users u ON s.user_id = u.id
         JOIN academies a ON s.academy_id = a.id
         JOIN identities ai ON ai.academy_id = s.academy_id AND ai.role = 'academy' AND ai.is_active = TRUE
         WHERE LOWER(i.wallet_address) = LOWER($1) AND i.role = 'student' AND i.is_active = TRUE AND ai.is_active = TRUE
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
        studentAddress: student_address,
        studentName: identity.student_name
    };
}
const validateProfessorExistence = async (professorAddress, academyId) => {
    const { rows: [identity] } = await db.query(
        `SELECT 1
         FROM identities i
         JOIN professors p ON i.user_id = p.user_id
         WHERE LOWER(i.wallet_address) = LOWER($1) AND i.role = 'professor' AND i.is_active = TRUE AND p.academy_id = $2`,
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
        encryptedPayload
    } = data;

    await db.query(
        `UPDATE credentials
         SET signature = $2, encrypted_payload = $3, updated_at = NOW(), status = 'pending'
         WHERE id = $1`,
        [credentialId, signature, encryptedPayload]
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

const fetchCredentialById = async (credentialId) => {
    const { rows: [credential] } = await db.query(
        `SELECT c.id, c.title, c.code, c.type, c.description, 
                c.authorizer_wallet_address, c.issuer_wallet_address, c.student_wallet_address, 
                c.payload_hash, c.payload,
                ii.public_key AS student_public_key,
                a.name AS academy_name,
                u.full_name AS student_name,
                u.email AS student_email
         FROM credentials c
         JOIN identities i ON LOWER(c.authorizer_wallet_address) = LOWER(i.wallet_address) AND i.role = 'academy' AND i.is_active = TRUE
         JOIN academies a ON i.academy_id = a.id
         JOIN identities ii ON LOWER(c.student_wallet_address) = LOWER(ii.wallet_address) AND ii.role = 'student' AND ii.is_active = TRUE
         JOIN users u ON ii.user_id = u.id
         WHERE c.id = $1`,
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
const validateIssuerIdentity = async (wallet_address) => {
    const { rows: [identity] } = await db.query(
        `SELECT 1 
         FROM identities 
         WHERE LOWER(wallet_address) = LOWER($1) AND is_active = TRUE`,
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


// Services
const createCredentialService = async (issuer_address, data) => {
    const {
        title,
        credential_type,
        description,
        student_address,
        payload
    } = data;

    const checksumStudentAddr = ethers.getAddress(student_address);
    const {
        academyId,
        academyAddress,
        academyName,
        studentAddress,
        studentName
    } = await getStudentAndAcademyData(checksumStudentAddr);

    const checksumIssuerAddr = ethers.getAddress(issuer_address);
    if(checksumIssuerAddr !== academyAddress) await validateProfessorExistence(checksumIssuerAddr, academyId);

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
    const credential = await fetchCredentialById(credential_id);

    const checksumIssuerAddr = ethers.getAddress(issuer_address);
    if(checksumIssuerAddr !== credential.issuer_wallet_address) {
        const err = new Error('Only the issuer can issue this credential');
        err.statusCode = 403;
        err.code = 'FORBIDDEN_ISSUANCE';
        throw err;
    }

    if(checksumIssuerAddr !== credential.authorizer_wallet_address) await validateIssuerIdentity(checksumIssuerAddr);

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
        payloadSignature: signature,
        encryptedPayload
    });

    await updateCredential(credential.id, { signature, encryptedPayload });

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


export { createCredentialService, issueCredentialService };