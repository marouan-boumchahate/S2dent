import db from '../../../config/db.js'
import {
    issueProfessorIdentity,
    revokeProfessorIdentity
} from '../../../blockchain/identity/professor.identity.blockchain.js'
import { listenOnTransaction } from '../../../blockchain/listener.js'


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
const getProfessorIdentityPayload = async (email) => {
    const { rows: [professor] } = await db.query(
        `SELECT u.id AS user_id, u.email, u.full_name, u.national_id, 
                p.employee_number, p.hire_date, p.rank, p.employment_type, p.title,
                a.wallet_address AS academy_wallet_address, a.name AS academy_name,
                addr.id AS address_id,
                d.is_active AS is_department_active
         FROM users u
         JOIN professors p ON u.id = p.user_id
         JOIN academies a ON p.academy_id = a.id
         LEFT JOIN addresses addr ON addr.user_id = u.id
         LEFT JOIN departments d ON d.academy_id = a.id
         WHERE u.email = $1`,
        [email]
    )

    if (!professor) {
        const err = new Error('Professor not found')
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
const getProfessorRevokePayload = async (academyAddress, professorAddress) => {
    const { rows: [professor] } = await db.query(
        `SELECT u.email, u.full_name,
                p.employee_number, p.title,
                a.wallet_address AS academy_wallet_address, a.name AS academy_name
         FROM identities i
         JOIN users u ON u.id = i.user_id
         JOIN professors p ON u.id = p.user_id
         JOIN academies a ON p.academy_id = a.id
         WHERE i.wallet_address = $1
           AND a.wallet_address = $2
           AND i.role = 'professor'`,
        [professorAddress, academyAddress]
    )

    if (!professor) {
        const err = new Error('Professor not found')
        err.statusCode = 404
        err.code = 'PROFESSOR_NOT_FOUND'
        throw err
    }

    return professor;
}
const ensureWalletAddressUnique = async (walletAddress) => {
    const { rows } = await db.query(
        `SELECT 1 FROM identities WHERE wallet_address = $1 LIMIT 1`,
        [walletAddress]
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


// Issuance
// --------
const ISSUE_ON_SUCCESS = (title, name, academyName) => ({
    subject: 'Identity Issuance Confirmed',
    message: `Congratulations ${title} ${name}! Your identity issuance has been successfully confirmed on the system. Your academy identity is now fully active and ready to use. We\'re excited to have you on ${academyName}!`
})
const ISSUE_ON_FAILURE = (title, name) => ({
    subject: 'Identity Issuance Pending Resolution',
    message: `Hello, ${title} ${name}\nWe encountered a temporary issue with your identity issuance. Our team is reviewing this, and we\'re confident we\'ll have it resolved shortly. Please reach out to support if you need any assistance.`
})

export const issueProfessorIdentityService = async ({ wallet_address, email }) => {
    const professorWallet = ethers.getAddress(wallet_address)

    await ensureWalletAddressUnique(professorWallet)
    const professor = await getProfessorIdentityPayload(email)

    const tx = await issueProfessorIdentity({
        professorWallet,
        academyWallet: professor.academy_wallet_address,

        employeeId: professor.employee_number,
        fullName: professor.full_name,
        nationalId: professor.national_id,

        hireDate: formatDateOnly(professor.hire_date),
        rank: professor.rank,
        employmentType: professor.employment_type
    })

    const payload = {
        action: 'issue',

        wallet_address: professorWallet,
        user_id: professor.user_id,
        professor_number: professor.employee_number,
        name: professor.full_name,

        role: 'professor',
        
        email: professor.email,
        onSuccess: ISSUE_ON_SUCCESS(professor.title, professor.full_name, professor.academy_name),
        onFailure: ISSUE_ON_FAILURE(professor.title, professor.full_name)
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


// Revocation
// ----------
const REVOKE_ON_SUCCESS = (title, name, academyName) => ({
    subject: 'Identity Revocation Confirmed',
    message: `Hello ${title} ${name}, your identity at ${academyName} has been revoked. Your professor identity is no longer active. If this action was unexpected, please reach out to your academy.`
})
const REVOKE_ON_FAILURE = (title, name) => ({
    subject: 'Identity Revocation Pending Resolution',
    message: `Hello, ${title} ${name}\nWe encountered a temporary issue with your identity revocation. Our team is reviewing this, and we\'re confident we\'ll have it resolved shortly. Please reach out to support if you need any assistance.`
})

export const revokeProfessorIdentityService = async ({ academy_address, professor_address }) => {
    const professorWallet = ethers.getAddress(professor_address)
    const academyWallet = ethers.getAddress(academy_address)

    const professor = await getProfessorRevokePayload(academyWallet, professorWallet)

    const tx = await revokeProfessorIdentity({
        professorWallet,
        academyWallet: professor.academy_wallet_address
    })

    const payload = {
        action: 'revoke',

        wallet_address: professorWallet,
        professor_number: professor.employee_number,
        name: professor.full_name,

        role: 'professor',

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
