import db from '../../../config/db.js'
import {
    issueProfessorIdentity,
    revokeProfessorIdentity,
    getProfessorIdentity
} from '../../../blockchain/identity/professor.identity.blockchain.js'
import { listenOnTransaction } from '../../../blockchain/listener.js'
import { ethers } from 'ethers'
import { getCache, delCache } from '../../../cache/cache.client.js'
import { otpKey } from '../../../cache/cache.keys.js'
import { recoverSigner, hash, recoverSignerFromTypedData } from '../../../utils/crypto.js'
import { env } from '../../../config/env.js';
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
    message: `Dear ${title} ${name},\n\nWe are pleased to inform you that your verified identity has been successfully issued on the S2dent network under ${academyName}. Your professor identity is now fully active and recognized on-chain.\n\nYou may now access all platform features associated with your role.\n\nShould you have any questions, please do not hesitate to reach out to us at support@s2dent.io.\n\nRegards,\nThe S2dent Team`
})
const REVOKE_ON_SUCCESS_EMAIL = (title, name, academyName) => ({
    subject: `Identity Revocation Notice – ${title} ${name}`,
    message: `Dear ${title} ${name},\n\nThis is to confirm that your verified identity under ${academyName} has been permanently revoked from the S2dent network. Your professor identity is no longer active or recognized on-chain.\n\nIf this action was authorized, no further steps are required.\n\nIf you believe this was done in error, please contact ${academyName} directly for clarification.\n\nRegards,\nThe S2dent Team`
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
const getProfessorById = async (professor_id, role) => {
    if (role !== 'professor') {
        const err = new Error('Professor not found with the provided email')
        err.statusCode = 404
        err.code = 'PROFESSOR_NOT_FOUND'
        throw err
    }

    const { rows: [professor] } = await db.query(
        `SELECT u.id AS user_id, u.email, u.full_name, u.national_id, 
                p.employee_number, p.hire_date, p.rank, p.employment_type, p.title,
                i.wallet_address AS academy_wallet_address,
                a.name AS academy_name,
                addr.id AS address_id,
                d.is_active AS is_department_active
         FROM professors p
         JOIN users u ON u.id = p.user_id
         JOIN academies a ON p.academy_id = a.id
         JOIN identities i ON i.academy_id = a.id
         LEFT JOIN addresses addr ON addr.user_id = u.id
         LEFT JOIN departments d ON d.academy_id = a.id
         WHERE p.id = $1
         LIMIT 1`,
        [professor_id]
    )

    if (!professor) {
        const err = new Error('Professor not found')
        err.statusCode = 404
        err.code = 'PROFESSOR_NOT_FOUND'
        throw err
    }

    if(!professor.academy_wallet_address) {
        const err = new Error('Associated academy does not have a registered identity')
        err.statusCode = 400
        err.code = 'ACADEMY_IDENTITY_NOT_FOUND'
        throw err
    }

    if (professor.is_department_active === false) {
        const err = new Error("Professor's department is not active")
        err.statusCode = 403
        err.code = 'DEPARTMENT_INACTIVE'
        throw err
    }

    if (!professor.address_id) {
        const err = new Error('Professor does not have a registered address')
        err.statusCode = 400
        err.code = 'ADDRESS_NOT_FOUND'
        throw err
    }

    return professor
}
const getProfessorRevokePayload = async (academyWallet, professorWallet) => {
    const { rows: [professor] } = await db.query(
        `SELECT u.email, u.full_name,
                p.employee_number, p.title,
                ai.wallet_address AS academy_wallet_address,
                i.wallet_address AS professor_wallet_address,
                a.name AS academy_name
         FROM identities i
         JOIN users u ON u.id = i.user_id
         JOIN professors p ON u.id = p.user_id
         JOIN academies a ON p.academy_id = a.id
         JOIN identities ai ON ai.academy_id = a.id AND ai.role = 'academy'
         WHERE i.wallet_address = $1
           AND ai.wallet_address = $2
           AND i.role = 'professor'`,
        [professorWallet, academyWallet]
    )

    if (!professor) {
        const err = new Error('Professor not found')
        err.statusCode = 404
        err.code = 'PROFESSOR_NOT_FOUND'
        throw err
    }

    if(!professor.academy_wallet_address) {
        const err = new Error('Academy not found for the professor')
        err.statusCode = 404
        err.code = 'ACADEMY_NOT_FOUND'
        throw err
    }

    return professor;
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
const saveTransaction = async (txHash, payloadObj) => {
    const payload = JSON.stringify(payloadObj)

    await db.query(
        `INSERT INTO pending_transactions (tx_hash, payload)
         VALUES ($1, $2)`,
        [txHash, payload]
    )
}
const updateIdentityInDb = async ({ 
    wallet_address, 
    issueTxHash, 
    revokeTxHash,
    signature 
}) => {
    await db.query(`UPDATE identities
        SET issue_identity_tx_hash = COALESCE($1, issue_identity_tx_hash), 
            revoke_identity_tx_hash = COALESCE($2, revoke_identity_tx_hash), 
            signature = COALESCE($3, signature),
            updated_at = NOW() 
        WHERE wallet_address = $4`,
        [issueTxHash, revokeTxHash, signature, wallet_address]
    )
}
const InsertIdentityToDb = async ({ 
    userId, 
    signature, 
    signerPublicKey, 
    signerAddress 
}) => {
    await db.query(
        `INSERT INTO identities
        (user_id, role, wallet_address, public_key, signature)
        VALUES ($1, $2, $3, $4, $5)`,
        [userId, "professor", signerAddress, signerPublicKey, signature]
    )
}
const getProfessorWalletByUserId = async (userId) => {
    const { rows: [identity] } = await db.query(
        `SELECT wallet_address
         FROM identities
         WHERE user_id = $1
           AND role = 'professor'
         LIMIT 1`,
        [userId]
    )

    if (!identity?.wallet_address) {
        const err = new Error('Professor identity not found')
        err.statusCode = 404
        err.code = 'PROFESSOR_IDENTITY_NOT_FOUND'
        throw err
    }

    return identity.wallet_address
}
const getProfessorIdentitySigningData = (professor) => {
    const chainId = blockchainConfig.chainId || 31337;
    const verifyingContract = blockchainConfig.deployedContractAddress;

    const {
        employee_number,
        full_name,
        national_id,
        public_key,
        professor_wallet_address: wallet_address,
        academy_wallet_address: issuer,
        academy_name,
        hire_date
    } = professor;

    const signingData = {
        domain: {
            name: "S2dent",
            version: "1",
            chainId: parseInt(chainId),
            verifyingContract: verifyingContract,
        },
        types: {
            ProfessorIdentity: [
                { name: "professorIdHash", type: "bytes32" },
                { name: "fullName", type: "string" },
                { name: "nationalIdHash", type: "bytes32" },
                { name: "publicKey", type: "string" },
                { name: "walletAddress", type: "address" },
                { name: "academyWalletAddress", type: "address" },
                { name: "academyName", type: "string" },
                { name: "hireDate", type: "string" },
            ],
        },
        message: {
            professorIdHash: hash(employee_number),
            fullName: full_name,
            nationalIdHash: hash(national_id),
            publicKey: public_key,
            walletAddress: wallet_address,
            academyWalletAddress: issuer,
            academyName: academy_name,
            hireDate: formatDateOnly(hire_date),
        },
    };

    return signingData;
}
const getProfessorRecordFromDb = async (walletAddress, academy_id) => {
    const { rows: [professor] } = await db.query(
    `SELECT u.id AS user_id,u.full_name, u.national_id, u.email,
            p.employee_number, p.hire_date, p.rank, p.employment_type,
            i.public_key,
            ai.wallet_address AS academy_wallet_address,
            a.name AS academy_name,
            addr.id AS address_id,
            d.is_active AS is_department_active
         FROM identities i
         JOIN users u ON u.id = i.user_id
         JOIN professors p ON u.id = p.user_id AND p.academy_id = $2
         JOIN academies a ON p.academy_id = a.id
         JOIN identities ai ON ai.academy_id = a.id AND ai.role = 'academy'
         LEFT JOIN addresses addr ON addr.user_id = u.id
         LEFT JOIN departments d ON p.department_id = d.id
         WHERE i.wallet_address = $1
            AND i.role = 'professor'
            AND i.status = 'pending'
         LIMIT 1`,
        [walletAddress, academy_id]
    )

    if (!professor) {
        const err = new Error('Professor not found for the provided wallet address within the academy')
        err.statusCode = 404
        err.code = 'PROFESSOR_NOT_FOUND'
        throw err
    }

    if (professor.is_department_active === false) {
        const err = new Error("Professor's department is not active")
        err.statusCode = 403
        err.code = 'DEPARTMENT_INACTIVE'
        throw err
    }

    if (!professor.address_id) {
        const err = new Error('Professor does not have a registered address')
        err.statusCode = 400
        err.code = 'ADDRESS_NOT_FOUND'
        throw err
    }

    return professor
}
const verifySignature = (signingData, signature, expectedAddress) => {
    const recoveredAddress = recoverSignerFromTypedData(
        signingData.domain, 
        signingData.types, 
        signingData.message, 
        signature
    )

    if (ethers.getAddress(recoveredAddress) !== ethers.getAddress(expectedAddress)) {
        const err = new Error('Invalid signature for the provided data')
        err.statusCode = 400
        err.code = 'INVALID_SIGNATURE'
        throw err
    }
}


// Services
const generateIdentitySignatureSchemaService = async ({ wallet_address, academy_id }) => {
    const professor = await getProfessorRecordFromDb(wallet_address, academy_id)
    return getProfessorIdentitySigningData({
        ...professor, 
        professor_wallet_address: wallet_address 
    })
}
const requestIdentityIssuanceService = async ({ otp, email, signature }) => {
    email = email.toLowerCase().trim()

    const { id, message, role } = await fetchFromCache(email, otp)
    const professor = await getProfessorById(id, role)

    const { signerPublicKey, signerAddress } = recoverSigner(message, signature)
    const checksumAddr = ethers.getAddress(signerAddress)

    await ensureWalletAddressUnique(checksumAddr)

    await InsertIdentityToDb({ 
        userId: professor.user_id, 
        signature, 
        signerPublicKey, 
        signerAddress: checksumAddr
    })

    emitToUser(
        professor.academy_wallet_address, 
        'notification', 
        { message: `${professor.title} ${professor.full_name} has requested on-chain identity issuance.` }
    )

    return { wallet_address: checksumAddr }
}
const issueProfessorIdentityService = async ({ wallet_address, academy_id, signature }) => {
    const checksumAddr = ethers.getAddress(wallet_address)
    const professor = await getProfessorRecordFromDb(checksumAddr, academy_id)

    const signingData = getProfessorIdentitySigningData({ ...professor, professor_wallet_address: checksumAddr })
    verifySignature(signingData, signature, professor.academy_wallet_address)

    const tx = await issueProfessorIdentity({
        professorAddress: checksumAddr,
        academyAddress: professor.academy_wallet_address,
        publicKey: professor.public_key,
        signature,

        employeeId: professor.employee_number,
        fullName: professor.full_name,
        nationalId: professor.national_id,

        hireDate: formatDateOnly(professor.hire_date),
        rank: professor.rank,
        employmentType: professor.employment_type
    })
    await updateIdentityInDb({ wallet_address: checksumAddr, issueTxHash: tx.hash, signature })

    const emailSuccess = ISSUE_ON_SUCCESS_EMAIL(professor.title, professor.full_name, professor.academy_name)
    const emailFailure = null
    const emitSuccess = ISSUE_ON_SUCCESS_EMIT(professor.title, professor.full_name)
    const emitFailure = ISSUE_ON_FAILURE_EMIT(professor.title, professor.full_name)

    const notification = buildNotification({
        emailSuccess,
        emailFailure,
        emitSuccess,
        emitFailure,
        successReceiver: professor.academy_wallet_address,
        failureReceiver: professor.academy_wallet_address
    })

    const payload = {
        action: 'identity_issue',
        entity_id: professor.user_id,
        role: 'professor',

        wallet_address: checksumAddr,
        public_key: professor.public_key,
        signature,
        
        email: professor.email,
        notification
    }
    await saveTransaction(tx.hash, payload)

    listenOnTransaction(tx)

    return {
        professor_wallet: checksumAddr,
        blockchain_transaction: {
            tx_hash: tx.hash,
            status: 'pending',
        }
    }
}
const revokeProfessorIdentityService = async ({ academy_address, professor_address, reason }) => {
    const professorWallet = ethers.getAddress(professor_address)
    const academyWallet = ethers.getAddress(academy_address)

    const professor = await getProfessorRevokePayload(academyWallet, professorWallet)

    const tx = await revokeProfessorIdentity({ 
        professorAddress: professor.professor_wallet_address, 
        academyAddress: professor.academy_wallet_address,
        reason
    })
    await updateIdentityInDb({ wallet_address: professorWallet, revokeTxHash: tx.hash })

    const emailSuccess = REVOKE_ON_SUCCESS_EMAIL(professor.title, professor.full_name, professor.academy_name)
    const emailFailure = null //REVOKE_ON_FAILURE_EMAIL(professor.title, professor.full_name, professor.academy_name)
    const emitSuccess = REVOKE_ON_SUCCESS_EMIT(professor.title, professor.full_name)
    const emitFailure = REVOKE_ON_FAILURE_EMIT(professor.title, professor.full_name)

    const notification = buildNotification({
        emailSuccess,
        emailFailure,
        emitSuccess,
        emitFailure,
        successReceiver: professor.academy_wallet_address,
        failureReceiver: professor.academy_wallet_address
    })

    const payload = {
        action: 'identity_revoke',

        user_id: professor.user_id,
        role: 'professor',
        wallet_address: professorWallet,
        reason,

        email: professor.email,
        notification
    }
    await saveTransaction(tx.hash, payload)

    listenOnTransaction(tx)

    return {
        professor_wallet: professorWallet,
        blockchain_transaction: {
            tx_hash: tx.hash,
            status: 'pending',
        }
    }
}
const fetchProfessorIdentityByWalletService = async (walletAddress) => {
    const checksumAddr = validateWalletAddress(walletAddress)
    const identity = await getProfessorIdentity(checksumAddr)

    if (!identity) {
        const err = new Error('Professor identity not found')
        err.statusCode = 404
        err.code = 'PROFESSOR_IDENTITY_NOT_FOUND'
        throw err
    }

    return {
        wallet_address: checksumAddr,
        ...toIdentityDto(identity),
    }
}
const fetchProfessorIdentityByUserIdService = async (userId) => {
    const walletAddress = await getProfessorWalletByUserId(userId)
    return fetchProfessorIdentityByWalletService(walletAddress)
}


export { 
    requestIdentityIssuanceService,
    generateIdentitySignatureSchemaService,
    issueProfessorIdentityService, 
    revokeProfessorIdentityService, 
    fetchProfessorIdentityByWalletService,
    fetchProfessorIdentityByUserIdService
}
