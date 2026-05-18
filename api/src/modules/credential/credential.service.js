import { ethers } from 'ethers';
import db from '../../config/db.js';
import { env } from '../../config/env.js';
import { hash } from '../../utils/crypto.js';


// constants
const blockchainConfig = env.blockchain;

// Helpers
const getStudentAndAcademyData = async (student_address) => {
    const { rows: [identity] } = await db.query(
        `SELECT s.academy_id, u.full_name AS student_name, a.name AS academy_name, ai.wallet_address AS academy_wallet_address
         FROM identities i
         JOIN students s ON i.user_id = s.user_id
         JOIN users u ON s.user_id = u.id
         JOIN academies a ON s.academy_id = a.id
         JOIN identities ai ON ai.academy_id = s.academy_id AND ai.role = 'academy' AND ai.is_active = TRUE
         WHERE i.wallet_address = $1 AND i.role = 'student' AND i.is_active = TRUE AND ai.is_active = TRUE
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
         WHERE i.wallet_address = $1 AND i.role = 'professor' AND i.is_active = TRUE AND p.academy_id = $2`,
        [professorAddress, academyId]
    );

    if (!identity) {
        const err = new Error('Professor identity not registered or inactive for the specified academy');
        err.statusCode = 401;
        err.code = 'UNAUTHORIZED_ISSUER';
        throw err;
    }
}
const getAcademyData = async (issuer_address) => {
    const { rows: [identity] } = await db.query(
        `SELECT academy_id, name AS academy_name
         FROM identities 
         JOIN academies ON identities.academy_id = academies.id
         WHERE wallet_address = $1 AND role = 'academy' AND is_active = TRUE
         LIMIT 1`,
        [issuer_address]
    );

    if (!identity) {
        const err = new Error('Issuer identity is not active');
        err.statusCode = 401;
        err.code = 'UNAUTHORIZED_ISSUER';
        throw err;
    }

    return {
        academyId: identity.academy_id,
        academyName: identity.academy_name,
        academyAddress: issuer_address
    };
};
const getStudentData = async (student_address) => {
    const { rows: [identity] } = await db.query(
        `SELECT s.academy_id, u.full_name AS student_name
         FROM identities i
         JOIN students s ON i.user_id = s.user_id
         JOIN users u ON s.user_id = u.id
         WHERE i.wallet_address = $1 AND i.role = 'student' AND i.is_active = TRUE
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
        studentName: identity.student_name,
        studentAddress: student_address
    };
}
const getProfessorAcademyData = async (issuer_address) => {
    const { rows: [identity] } = await db.query(
        `SELECT ia.academy_id, ia.wallet_address, a.name AS academy_name
         FROM identities i
         JOIN professors p ON i.user_id = p.user_id
         JOIN academies a ON p.academy_id = a.id
         JOIN identities ia ON a.id = ia.academy_id AND ia.role = 'academy' AND ia.is_active = TRUE
         WHERE i.wallet_address = $1 AND i.role = 'professor' AND i.is_active = TRUE
         LIMIT 1`,
        [issuer_address]
    );

    if (!identity) {
        const err = new Error('Issuer identity is not active');
        err.statusCode = 401;
        err.code = 'UNAUTHORIZED_ISSUER';
        throw err;
    }

    return {
        academyId: identity.academy_id,
        academyName: identity.academy_name,
        academyAddress: identity.academy_wallet_address
    };
}
const getAcademyWalletById = async (academy_id) => {
    const { rows: [academy] } = await db.query(
        `SELECT wallet_address
         FROM identities 
         WHERE academy_id = $1 AND is_active = TRUE
         LIMIT 1`,
        [academy_id]
    );

    if (!academy) {
        const err = new Error('Academy not found or inactive');
        err.statusCode = 404;
        err.code = 'ACADEMY_NOT_FOUND';
        throw err;
    }

    return academy.wallet_address;
}
const extractAddresses = (role, issuer_address, student_address) => {
    const studentData = getStudentData(student_address);
    const AcademyData = role === 'academy' 
        ? getAcademyData(issuer_address) 
        : getProfessorAcademyData(issuer_address);

    if (studentData.academyId !== AcademyData.academyId) {
        const err = new Error('Student and issuer must belong to the same academy');
        err.statusCode = 400;
        err.code = 'ACADEMY_MISMATCH';
        throw err;
    }
  
    return {
        academyData: role === 'academy' ? issuer_address : getAcademyWalletById(studentData.academy_id),
        issuerAddress: issuer_address,
        studentData: studentData
    };
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
                { name: "credentialId", type: "bytes32" },
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
            credentialId: hash(credentialId),
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

// Services
const createCredentialService = async (issuer_address, role, data) => {
    const {
        title,
        credential_type,
        description,
        student_address,
        payload
    } = data;

    const {
        academyId,
        academyAddress,
        academyName,
        studentAddress,
        studentName
    } = await getStudentAndAcademyData(student_address);

    if(issuer_address !== academyAddress) await validateProfessorExistence(issuer_address, academyId);

    const credentialCode = await generateCredentialCode();
    await ensureUniqueCredentialCode(credentialCode);

    const payloadHash = getPayloadHash(payload);

    const insertedCredential = await insertCredentialToDB({
        title,
        credentialCode,
        credential_type,
        description,
        academyAddress,
        issuerAddress: issuer_address,
        studentAddress,
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
        issuerAddress: issuer_address,
        studentAddress,
        studentName,
        payloadHash
    });

    return signingData;
};


export { createCredentialService };