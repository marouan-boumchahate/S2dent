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
import { recoverSigner } from '../../../utils/crypto.js'


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
const ISSUE_ON_SUCCESS = (title, name, academyName) => ({
    subject: 'Identity Issuance Confirmed',
    message: `Congratulations ${title} ${name}! Your identity issuance has been successfully confirmed on the system. Your academy identity is now fully active and ready to use. We\'re excited to have you on ${academyName}!`
})
const ISSUE_ON_FAILURE = (title, name) => ({
    subject: 'Identity Issuance Pending Resolution',
    message: `Hello, ${title} ${name}\nWe encountered a temporary issue with your identity issuance. Our team is reviewing this, and we\'re confident we\'ll have it resolved shortly. Please reach out to support if you need any assistance.`
})

const REVOKE_ON_SUCCESS = (title, name, academyName) => ({
    subject: 'Identity Revocation Confirmed',
    message: `Hello ${title} ${name}, your identity at ${academyName} has been revoked. Your professor identity is no longer active. If this action was unexpected, please reach out to your academy.`
})
const REVOKE_ON_FAILURE = (title, name) => ({
    subject: 'Identity Revocation Pending Resolution',
    message: `Hello, ${title} ${name}\nWe encountered a temporary issue with your identity revocation. Our team is reviewing this, and we\'re confident we\'ll have it resolved shortly. Please reach out to support if you need any assistance.`
})


// Helpers
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
const insertIdentityRecord = async ({ userId, issueTxHash }) => {
    await db.query(
        `INSERT INTO identities
        (user_id, role, issue_identity_tx_hash)
        VALUES ($1, $2, $3)`,
        [userId, "professor", issueTxHash]
    )
}
const updateIdentityRecord = async (revokeTxHash, walletAddress) => {
    await db.query(
        `UPDATE identities
            SET revoke_identity_tx_hash = $1, updated_at = NOW()
            WHERE wallet_address = $2`,
        [revokeTxHash, walletAddress]
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


// Services
const issueProfessorIdentityService = async ({ otp, email, signature }) => {
    email = email.toLowerCase().trim()

    const { id, message, role } = await fetchFromCache(email, otp)
    const professor = await getProfessorById(id, role)

    const { signerPublicKey, signerAddress } = recoverSigner(message, signature)
    const checksumAddr = ethers.getAddress(signerAddress)

    await ensureWalletAddressUnique(checksumAddr)

    const tx = await issueProfessorIdentity({
        professorAddress: checksumAddr,
        academyAddress: professor.academy_wallet_address,
        publicKey: signerPublicKey,

        employeeId: professor.employee_number,
        fullName: professor.full_name,
        nationalId: professor.national_id,

        hireDate: formatDateOnly(professor.hire_date),
        rank: professor.rank,
        employmentType: professor.employment_type
    })
    await insertIdentityRecord({ userId: professor.user_id, issueTxHash: tx.hash })

    const payload = {
        action: 'identity_issue',
        entity_id: professor.user_id,
        role: 'professor',

        wallet_address: checksumAddr,
        public_key: signerPublicKey,
        
        email: professor.email,
        onSuccess: ISSUE_ON_SUCCESS(professor.title, professor.full_name, professor.academy_name),
        onFailure: ISSUE_ON_FAILURE(professor.title, professor.full_name)
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
    await updateIdentityRecord(tx.hash, professorWallet)

    const payload = {
        action: 'identity_revoke',

        user_id: professor.user_id,
        role: 'professor',
        wallet_address: professorWallet,
        reason,

        email: professor.email,
        onSuccess: REVOKE_ON_SUCCESS(professor.title, professor.full_name, professor.academy_name),
        onFailure: REVOKE_ON_FAILURE(professor.title, professor.full_name)
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
    issueProfessorIdentityService, 
    revokeProfessorIdentityService, 
    fetchProfessorIdentityByWalletService,
    fetchProfessorIdentityByUserIdService 
}
