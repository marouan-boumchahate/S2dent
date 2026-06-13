import db from '../../../config/db.js'
import {
    issueStudentIdentity,
    revokeStudentIdentity,
    getStudentIdentity
} from '../../../blockchain/identity/student.identity.blockchain.js'
import { listenOnTransaction } from '../../../blockchain/listener.js'
import { ethers } from 'ethers'
import { getCache, delCache } from '../../../cache/cache.client.js'
import { otpKey } from '../../../cache/cache.keys.js'
import { recoverSigner, hash, recoverSignerFromTypedData } from '../../../utils/crypto.js'
import { env } from '../../../config/env.js'
import { emitToUser } from '../../../config/socket.js'


// DTOs
const toSnakeCaseKey = (key) => key.replace(/[A-Z]/g, (match) => `_${match.toLowerCase()}`)
const toIdentityDto = (value) => {
    if (Array.isArray(value)) return value.map(toIdentityDto)
    if (!value || typeof value !== 'object' || value instanceof Date) return value

    return Object.fromEntries(
        Object.entries(value).map(([key, nestedValue]) => [toSnakeCaseKey(key), toIdentityDto(nestedValue)])
    )
}


// Constants
const blockchainConfig = env.blockchain;

const ISSUE_ON_SUCCESS_EMAIL = (title, name, academyName) => ({
    subject: `Identity Issuance Confirmed – Welcome to S2dent, ${title} ${name}`,
    message: `Dear ${title} ${name},\n\nWe are pleased to inform you that your verified identity has been successfully issued on the S2dent network under ${academyName}. Your student identity is now fully active and recognized on-chain.\n\nYou may now access all platform features associated with your enrollment.\n\nShould you have any questions, please do not hesitate to reach out to us at support@s2dent.io.\n\nRegards,\nThe S2dent Team`
})
const REVOKE_ON_SUCCESS_EMAIL = (title, name, academyName) => ({
    subject: `Identity Revocation Notice – ${title} ${name}`,
    message: `Dear ${title} ${name},\n\nThis is to confirm that your verified identity under ${academyName} has been permanently revoked from the S2dent network. Your student identity is no longer active or recognized on-chain.\n\nIf this action was authorized, no further steps are required.\n\nIf you believe this was done in error, please contact ${academyName} directly for clarification.\n\nRegards,\nThe S2dent Team`
})

const ISSUE_ON_SUCCESS_EMIT = (title, name) => `Identity for ${title} ${name} successfully issued on-chain`
const ISSUE_ON_FAILURE_EMIT = (title, name) => `Identity for ${title} ${name} issuance needs attention`
const REVOKE_ON_SUCCESS_EMIT = (title, name) => `${title} ${name}'s identity successfully revoked on-chain`
const REVOKE_ON_FAILURE_EMIT = (title, name) => `${title} ${name}'s identity revocation needs attention`



// Helpers
const buildNotification = ({ emailSuccess, emailFailure, emitSuccess, emitFailure, successReceiver, failureReceiver }) => ({
    email: {
        success: emailSuccess,
        failure: emailFailure
    },
    emit: {
        success: emitSuccess ? { message: emitSuccess, receiver: successReceiver } : null,
        failure: emitFailure ? { message: emitFailure, receiver: failureReceiver } : null
    }
})
const formatDateOnly = (value) => {
    if (!value) return ''
    if (typeof value === 'string') return value.slice(0, 10)
    try {
        return value.toISOString().slice(0, 10)
    } catch {
        return String(value).slice(0, 10)
    }
}
const fetchFromCache = async (email, otp) => {
    const cacheKey = otpKey(email, otp)
    const cachedData = await getCache(cacheKey)

    if (!cachedData) {
        const err = new Error('Invalid or expired OTP')
        err.statusCode = 400
        err.code = 'INVALID_OTP'
        throw err
    }
    
    await delCache(cacheKey)

    return JSON.parse(cachedData)
}
const getStudentById = async (student_id, role) => {
    if (role !== 'student') {
        const err = new Error('Student not found with the provided email')
        err.statusCode = 404
        err.code = 'STUDENT_NOT_FOUND'
        throw err
    }

    const { rows: [student] } = await db.query(
        `SELECT u.id AS user_id, u.email, u.full_name, u.national_id, u.nationality, u.gender,
                s.student_number, s.enrollment_date,
                i.wallet_address AS academy_wallet_address,
                a.name AS academy_name,
                addr.country,
                d.is_active AS is_department_active, d.name AS department_name
         FROM students s
         JOIN users u ON u.id = s.user_id
         JOIN academies a ON s.academy_id = a.id
         JOIN identities i ON i.academy_id = a.id
         LEFT JOIN addresses addr ON addr.user_id = u.id
         LEFT JOIN departments d ON d.academy_id = a.id
         WHERE s.id = $1
         LIMIT 1`,
        [student_id]
    )

    if (!student) {
        const err = new Error('Student not found')
        err.statusCode = 404
        err.code = 'STUDENT_NOT_FOUND'
        throw err
    }

    if(!student.academy_wallet_address) {
        const err = new Error('Associated academy does not have a registered identity')
        err.statusCode = 400
        err.code = 'ACADEMY_IDENTITY_NOT_FOUND'
        throw err
    }

    if (student.is_department_active === false) {
        const err = new Error('Student\'s department is not active')
        err.statusCode = 403
        err.code = 'DEPARTMENT_INACTIVE'
        throw err
    }

    if (!student.country){
        const err = new Error('Student does not have a registered address')
        err.statusCode = 400
        err.code = 'ADDRESS_NOT_FOUND'
        throw err
    }
    
    return student;
}
const getStudentRevokePayload = async (academyAddress, studentAddress) => {
    const { rows: [student] } = await db.query(
        `SELECT u.email, u.full_name, u.gender,
                s.student_number,
                ai.wallet_address AS academy_wallet_address,
                i.wallet_address AS student_wallet_address,
                a.name AS academy_name
         FROM identities i
         JOIN users u ON u.id = i.user_id
         JOIN students s ON u.id = s.user_id
         JOIN academies a ON s.academy_id = a.id
         JOIN identities ai ON ai.academy_id = a.id AND ai.role = 'academy'
         WHERE i.wallet_address = $1
           AND ai.wallet_address = $2
           AND i.role = 'student'`,
        [studentAddress, academyAddress]
    )

    if (!student) {
        const err = new Error('Student not found')
        err.statusCode = 404
        err.code = 'STUDENT_NOT_FOUND'
        throw err
    }

    if(!student.academy_wallet_address) {
        const err = new Error('Academy not found for the student')
        err.statusCode = 404
        err.code = 'ACADEMY_NOT_FOUND'
        throw err
    }

    return student;
}
const validateWalletAddress = (walletAddress) => {
    try {
        return ethers.getAddress(walletAddress)
    } catch {
        const err = new Error('Invalid wallet address')
        err.statusCode = 400
        err.code = 'INVALID_ADDRESS'
        throw err
    }
}

const ensureWalletAddressUnique = async (wallet) => {
    const { rows } = await db.query(
        `SELECT 1 FROM identities WHERE wallet_address = $1 LIMIT 1`,
        [wallet]
    );

    if(rows.length > 0) {
        const err = new Error('Wallet address is already associated with an existing identity')
        err.statusCode = 409
        err.code = 'WALLET_ADDRESS_NOT_UNIQUE'
        throw err
    }
}
const getStudentIdentitySigningData = (student) => {
    const chainId = blockchainConfig.chainId;
    const verifyingContract = blockchainConfig.deployedContractAddress;

    const {
        student_number,
        full_name,
        national_id,
        public_key,
        student_wallet_address: wallet_address,
        academy_wallet_address: issuer,
        academy_name,
        enrollment_date,
        nationality,
        department_name,
        country,
    } = student;

    return {
        domain: {
            name: 'S2dent',
            version: '1',
            chainId: parseInt(chainId),
            verifyingContract,
        },
        types: {
            StudentIdentity: [
                { name: 'studentIdHash', type: 'bytes32' },
                { name: 'fullName', type: 'string' },
                { name: 'nationalIdHash', type: 'bytes32' },
                { name: 'publicKey', type: 'string' },
                { name: 'walletAddress', type: 'address' },
                { name: 'academyWalletAddress', type: 'address' },
                { name: 'academyName', type: 'string' },
                { name: 'enrollmentDate', type: 'string' },
                { name: 'department', type: 'string' },
            ],
        },
        message: {
            studentIdHash: hash(student_number),
            fullName: full_name,
            nationalIdHash: hash(national_id),
            publicKey: public_key,
            walletAddress: wallet_address,
            academyWalletAddress: issuer,
            academyName: academy_name,
            enrollmentDate: String(enrollment_date),
            department: department_name,
        },
    };
}
const verifySignature = (signingData, signature, expectedAddress) => {
    const recoveredAddress = recoverSignerFromTypedData(
        signingData.domain,
        signingData.types,
        signingData.message,
        signature,
    )

    if (ethers.getAddress(recoveredAddress) !== ethers.getAddress(expectedAddress)) {
        const err = new Error('Invalid signature for the provided data')
        err.statusCode = 400
        err.code = 'INVALID_SIGNATURE'
        throw err
    }
}
const saveTransaction = async (txHash, payloadObj) => {
    const payload = JSON.stringify(payloadObj)

    await db.query(
        `INSERT INTO pending_transactions (tx_hash, payload)
         VALUES ($1, $2)`,
        [txHash, payload]
    )
}
const insertIdentityToDb = async ({ userId, signature, signerPublicKey, signerAddress }) => {
    await db.query(
        `INSERT INTO identities
        (user_id, role, wallet_address, public_key, signature)
        VALUES ($1, $2, $3, $4, $5)`,
        [userId, 'student', signerAddress, signerPublicKey, signature]
    )
}
const updateIdentityInDb = async ({ wallet_address, issueTxHash, revokeTxHash, signature }) => {
    await db.query(
        `UPDATE identities
            SET issue_identity_tx_hash = COALESCE($1, issue_identity_tx_hash),
                revoke_identity_tx_hash = COALESCE($2, revoke_identity_tx_hash),
                signature = COALESCE($3, signature),
                updated_at = NOW()
            WHERE wallet_address = $4`,
        [issueTxHash, revokeTxHash, signature, wallet_address]
    )
}
const getStudentRecordFromDb = async (walletAddress, academy_id) => {
    const { rows: [student] } = await db.query(
        `SELECT u.id AS user_id, u.email, u.full_name, u.national_id, u.nationality, u.gender,
                s.student_number, s.enrollment_date,
                i.public_key,
                ai.wallet_address AS academy_wallet_address,
                a.name AS academy_name,
                addr.country,
                d.is_active AS is_department_active, d.name AS department_name
         FROM identities i
         JOIN users u ON u.id = i.user_id
         JOIN students s ON u.id = s.user_id AND s.academy_id = $2
         JOIN academies a ON s.academy_id = a.id
         JOIN identities ai ON ai.academy_id = a.id AND ai.role = 'academy'
         LEFT JOIN addresses addr ON addr.user_id = u.id
         LEFT JOIN departments d ON d.academy_id = a.id
         WHERE i.wallet_address = $1
            AND i.role = 'student'
            AND i.status = 'pending'
         LIMIT 1`,
        [walletAddress, academy_id]
    )

    if (!student) {
        const err = new Error('Student not found for the provided wallet address within the academy')
        err.statusCode = 404
        err.code = 'STUDENT_NOT_FOUND'
        throw err
    }

    if (!student.academy_wallet_address) {
        const err = new Error('Associated academy does not have a registered identity')
        err.statusCode = 400
        err.code = 'ACADEMY_IDENTITY_NOT_FOUND'
        throw err
    }

    if (student.is_department_active === false) {
        const err = new Error("Student's department is not active")
        err.statusCode = 403
        err.code = 'DEPARTMENT_INACTIVE'
        throw err
    }

    if (!student.country) {
        const err = new Error('Student does not have a registered address')
        err.statusCode = 400
        err.code = 'ADDRESS_NOT_FOUND'
        throw err
    }

    return student
}
const getStudentWalletByUserId = async (user_id, requester_id, requester_role) => {
    let clause = '';
    let params = [user_id];

    switch(requester_role) {
        case 'professor':
            clause = 'AND s.advisor_id = $2';
            params.push(requester_id);
            break;
        case 'academy':
            clause = 'AND s.academy_id = $2';
            params.push(requester_id);
            break;
        default:
            const err = new Error('Invalid requester role');
            err.statusCode = 400;
            err.code = 'INVALID_REQUESTER_ROLE';
            throw err;
    }

    const { rows: [identity] } = await db.query(
        `SELECT wallet_address
         FROM identities i
         JOIN students s ON i.user_id = s.user_id
         WHERE i.user_id = $1
           AND role = 'student'
           ${clause}
         LIMIT 1`,
        params
    )

    if (!identity?.wallet_address) {
        const err = new Error('Student identity not found')
        err.statusCode = 404
        err.code = 'STUDENT_IDENTITY_NOT_FOUND'
        throw err
    }

    return identity.wallet_address
}


// Services
const requestIdentityIssuanceService = async ({ otp, email, signature }) => {
    email = email.toLowerCase().trim()

    const { id, message, role } = await fetchFromCache(email, otp)
    const student = await getStudentById(id, role)

    const { signerPublicKey, signerAddress } = recoverSigner(message, signature)
    const checksumAddr = ethers.getAddress(signerAddress)

    await ensureWalletAddressUnique(checksumAddr)

    await insertIdentityToDb({
        userId: student.user_id,
        signature,
        signerPublicKey,
        signerAddress: checksumAddr,
    })

    const title = student.gender.toLowerCase() === 'male' ? 'Mr.' : 'Ms.'
    emitToUser(
        student.academy_wallet_address, 
        'notification', 
        { message: `${title} ${student.full_name} has requested on-chain identity issuance.` }
    )

    return { wallet_address: checksumAddr }
}
const generateIdentitySignatureSchemaService = async ({ wallet_address, academy_id }) => {
    const student = await getStudentRecordFromDb(wallet_address, academy_id)
    return getStudentIdentitySigningData({
        ...student,
        student_wallet_address: wallet_address,
    })
}
const issueStudentIdentityService = async ({ wallet_address, academy_id, signature }) => {
    const checksumAddr = ethers.getAddress(wallet_address)
    const student = await getStudentRecordFromDb(checksumAddr, academy_id)

    const signingData = getStudentIdentitySigningData({
        ...student,
        student_wallet_address: checksumAddr,
    })
    verifySignature(signingData, signature, student.academy_wallet_address)

    const tx = await issueStudentIdentity({
        studentAddress: checksumAddr,
        academyAddress: student.academy_wallet_address,
        publicKey: student.public_key,
        signature,

        studentId: student.student_number,
        fullName: student.full_name,
        nationalId: student.national_id,
        nationality: student.nationality,

        enrollmentDate: formatDateOnly(student.enrollment_date),
        department: student.department_name,
        country: student.country,
    })
    await updateIdentityInDb({ wallet_address: checksumAddr, issueTxHash: tx.hash, signature })

    const title = student.gender.toLowerCase() === 'male' ? 'Mr.' : 'Ms.'
    const emailSuccess = ISSUE_ON_SUCCESS_EMAIL(title, student.full_name, student.academy_name)
    const emailFailure = null
    const emitSuccess = ISSUE_ON_SUCCESS_EMIT(title, student.full_name)
    const emitFailure = ISSUE_ON_FAILURE_EMIT(title, student.full_name)

    const notification = buildNotification({
        emailSuccess,
        emailFailure,
        emitSuccess,
        emitFailure,
        successReceiver: student.academy_wallet_address,
        failureReceiver: student.academy_wallet_address,
    })

    const payload = {
        action: 'identity_issue',
        entity_id: student.user_id,
        role: 'student',

        wallet_address: checksumAddr,
        public_key: student.public_key,
        signature,

        email: student.email,
        notification,
    }
    await saveTransaction(tx.hash, payload)

    listenOnTransaction(tx)

    return {
        student_wallet: checksumAddr,
        blockchain_transaction: {
            tx_hash: tx.hash,
            status: 'pending',
        }
    }
}
const revokeStudentIdentityService = async ({ academy_address, student_address, reason }) => {
    const studentWallet = ethers.getAddress(student_address)
    const academyWallet = ethers.getAddress(academy_address)

    const student = await getStudentRevokePayload(academyWallet, studentWallet)

    const tx = await revokeStudentIdentity({ 
        studentAddress: student.student_wallet_address, 
        academyAddress: student.academy_wallet_address,
        reason
    })
    await updateIdentityInDb({ wallet_address: studentWallet, revokeTxHash: tx.hash })

    const title = student.gender.toLowerCase() === 'male' ? 'Mr.' : 'Ms.'
    const emailSuccess = REVOKE_ON_SUCCESS_EMAIL(title, student.full_name, student.academy_name)
    const emailFailure = null //REVOKE_ON_FAILURE_EMAIL(title, student.full_name, student.academy_name)
    const emitSuccess = REVOKE_ON_SUCCESS_EMIT(title, student.full_name)
    const emitFailure = REVOKE_ON_FAILURE_EMIT(title, student.full_name)

    const notification = buildNotification({
        emailSuccess,
        emailFailure,
        emitSuccess,
        emitFailure,
        successReceiver: student.academy_wallet_address,
        failureReceiver: student.academy_wallet_address
    })

    const payload = {
        action: 'identity_revoke',

        user_id: student.user_id,
        role: 'student',
        wallet_address: studentWallet,
        reason,

        email: student.email,
        notification
    }
    await saveTransaction(tx.hash, payload)

    listenOnTransaction(tx)

    return {
        student_wallet: studentWallet,
        blockchain_transaction: {
            tx_hash: tx.hash,
            status: 'pending',
        }
    }
}
const fetchStudentIdentityByWalletService = async (walletAddress) => {
    const checksumAddr = validateWalletAddress(walletAddress)
    const identity = await getStudentIdentity(checksumAddr)

    if (!identity) {
        const err = new Error('Student identity not found')
        err.statusCode = 404
        err.code = 'STUDENT_IDENTITY_NOT_FOUND'
        throw err
    }

    return {
        wallet_address: checksumAddr,
        ...toIdentityDto(identity),
    }
}
const fetchStudentIdentityByUserIdService = async ({
    user_id, requester_id, requester_role
}) => {
    const walletAddress = await getStudentWalletByUserId(
        user_id, 
        requester_id, 
        requester_role
    )
    return fetchStudentIdentityByWalletService(walletAddress)
}


export { 
    requestIdentityIssuanceService,
    generateIdentitySignatureSchemaService,
    issueStudentIdentityService,
    revokeStudentIdentityService, 
    fetchStudentIdentityByWalletService,
    fetchStudentIdentityByUserIdService 
}
