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
const ON_SUCCESS = (title, name, academyName) => ({
    subject: 'Identity Issuance Confirmed',
    message: `Congratulations ${title} ${name}! Your identity issuance has been successfully confirmed on the system. Your academy identity is now fully active and ready to use. We\'re excited to have you on ${academyName}!`
})
const ON_FAILURE = (title, name) => ({
    subject: 'Identity Issuance Pending Resolution',
    message: `Hello, ${title} ${name}\nWe encountered a temporary issue with your identity issuance. Our team is reviewing this, and we\'re confident we\'ll have it resolved shortly. Please reach out to support if you need any assistance.`
})

const REVOKE_ON_SUCCESS = (title, name, academyName) => ({
    subject: 'Identity Revocation Confirmed',
    message: `Hello ${title} ${name}, your identity at ${academyName} has been revoked. Your student identity is no longer active. If this action was unexpected, please reach out to your academy.`
})
const REVOKE_ON_FAILURE = (title, name) => ({
    subject: 'Identity Revocation Pending Resolution',
    message: `Hello, ${title} ${name}\nWe encountered a temporary issue with your identity revocation. Our team is reviewing this, and we\'re confident we\'ll have it resolved shortly. Please reach out to support if you need any assistance.`
})


// Helpers
// -------
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
        [userId, "student", issueTxHash]
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
const getStudentWalletByUserId = async (userId) => {
    const { rows: [identity] } = await db.query(
        `SELECT wallet_address
         FROM identities
         WHERE user_id = $1
           AND role = 'student'
         LIMIT 1`,
        [userId]
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
const issueStudentIdentityService = async ({ otp, email, signature }) => {
    email = email.toLowerCase().trim()

    const { id, message, role } = await fetchFromCache(email, otp)
    const student = await getStudentById(id, role)

    const { signerPublicKey, signerAddress } = recoverSigner(message, signature)
    const checksumAddr = ethers.getAddress(signerAddress)

    await ensureWalletAddressUnique(checksumAddr)

    const tx = await issueStudentIdentity({
        studentAddress: checksumAddr,
        academyAddress: student.academy_wallet_address,
        publicKey: signerPublicKey,

        studentId: student.student_number,
        fullName: student.full_name,
        nationalId: student.national_id,
        nationality: student.nationality,

        enrollmentDate: formatDateOnly(student.enrollment_date),
        department: student.department_name,
        country: student.country
    })
    await insertIdentityRecord({ userId: student.user_id, issueTxHash: tx.hash })

    const title = student.gender.toLowerCase() === 'male' ? 'Mr.' : 'Ms.'
    const payload = {
        action: 'identity_issue',
        entity_id: student.user_id,
        role: 'student',

        wallet_address: checksumAddr,
        public_key: signerPublicKey,
        
        email: student.email,
        onSuccess: ON_SUCCESS(title, student.full_name, student.academy_name),
        onFailure: ON_FAILURE(title, student.full_name)
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
    await updateIdentityRecord(tx.hash, studentWallet)

    const title = student.gender.toLowerCase() === 'male' ? 'Mr.' : 'Ms.'
    const payload = {
        action: 'identity_revoke',

        user_id: student.user_id,
        role: 'student',
        wallet_address: studentWallet,
        reason,

        email: student.email,
        onSuccess: REVOKE_ON_SUCCESS(title, student.full_name, student.academy_name),
        onFailure: REVOKE_ON_FAILURE(title, student.full_name)
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
const fetchStudentIdentityByUserIdService = async (userId) => {
    const walletAddress = await getStudentWalletByUserId(userId)
    return fetchStudentIdentityByWalletService(walletAddress)
}

export { 
    issueStudentIdentityService, 
    revokeStudentIdentityService, 
    fetchStudentIdentityByWalletService,
    fetchStudentIdentityByUserIdService 
}
