import db from '../../../config/db.js'
import {
    issueStudentIdentity,
    revokeStudentIdentity
} from '../../../blockchain/identity/student.identity.blockchain.js'
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

const getStudentIdentityPayload = async (email) => {
    const { rows: [student] } = await db.query(
        `SELECT u.id AS user_id, u.email, u.full_name, u.national_id, u.nationality, u.gender,
                s.student_number, s.enrollment_date,
                a.wallet_address AS academy_wallet_address, a.name AS academy_name,
                addr.country,
                d.is_active AS is_department_active, d.name AS department_name
         FROM users u
         JOIN students s ON u.id = s.user_id
         JOIN academies a ON s.academy_id = a.id
         JOIN addresses addr ON addr.user_id = u.id
         JOIN departments d ON d.academy_id = a.id
         WHERE u.email = $1`,
        [email]
    )

    if (!student) {
        const err = new Error('Student not found')
        err.statusCode = 404
        err.code = 'STUDENT_NOT_FOUND'
        throw err
    }

    if (!student.is_department_active){
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
                a.wallet_address AS academy_wallet_address, a.name AS academy_name
         FROM identities i
         JOIN users u ON u.id = i.user_id
         JOIN students s ON u.id = s.user_id
         JOIN academies a ON s.academy_id = a.id
         WHERE i.wallet_address = $1
           AND a.wallet_address = $2
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
const ON_SUCCESS = (title, name, academyName) => ({
    subject: 'Identity Issuance Confirmed',
    message: `Congratulations ${title} ${name}! Your identity issuance has been successfully confirmed on the system. Your academy identity is now fully active and ready to use. We\'re excited to have you on ${academyName}!`
})
const ON_FAILURE = (title, name) => ({
    subject: 'Identity Issuance Pending Resolution',
    message: `Hello, ${title} ${name}\nWe encountered a temporary issue with your identity issuance. Our team is reviewing this, and we\'re confident we\'ll have it resolved shortly. Please reach out to support if you need any assistance.`
})

export const issueStudentIdentityService = async ({ wallet_address, email }) => {
    const studentWallet = wallet_address

    const student = await getStudentIdentityPayload(email)

    const tx = await issueStudentIdentity({
        studentWallet,
        academyWallet: student.academy_wallet_address.toLowerCase(),

        studentId: student.student_number,
        fullName: student.full_name,
        nationalId: student.national_id,
        nationality: student.nationality,

        enrollmentDate: formatDateOnly(student.enrollment_date),
        department: student.department_name,
        country: student.country
    })

    const title = student.gender.toLowerCase() === 'male' ? 'Mr.' : 'Ms.'
    const payload = {
        action: 'issue',

        wallet_address: studentWallet,
        user_id: student.user_id,
        student_number: student.student_number,
        name: student.full_name,

        role: 'student',
        
        email: student.email,
        onSuccess: ON_SUCCESS(title, student.full_name, student.academy_name),
        onFailure: ON_FAILURE(title, student.full_name)
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


// Revocation
// ----------
const REVOKE_ON_SUCCESS = (title, name, academyName) => ({
    subject: 'Identity Revocation Confirmed',
    message: `Hello ${title} ${name}, your identity at ${academyName} has been revoked. Your student identity is no longer active. If this action was unexpected, please reach out to your academy.`
})
const REVOKE_ON_FAILURE = (title, name) => ({
    subject: 'Identity Revocation Pending Resolution',
    message: `Hello, ${title} ${name}\nWe encountered a temporary issue with your identity revocation. Our team is reviewing this, and we\'re confident we\'ll have it resolved shortly. Please reach out to support if you need any assistance.`
})

export const revokeStudentIdentityService = async ({ academy_address, student_address }) => {
    const studentWallet = student_address
    const academyWallet = academy_address

    const student = await getStudentRevokePayload(academyWallet, studentWallet)

    const tx = await revokeStudentIdentity({
        studentWallet,
        academyWallet: student.academy_wallet_address.toLowerCase()
    })

    const title = student.gender.toLowerCase() === 'male' ? 'Mr.' : 'Ms.'
    const payload = {
        action: 'revoke',

        wallet_address: studentWallet,
        student_number: student.student_number,
        name: student.full_name,

        role: 'student',

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
