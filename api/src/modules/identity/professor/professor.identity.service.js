import db from '../../../config/db.js'
import { issueProfessorIdentity } from '../../../blockchain/identity/professor.identity.blockchain.js'
import { listenOnTransaction } from '../../../blockchain/listener.js'

const ON_SUCCESS = (title, name, academyName) => ({
    subject: 'Identity Issuance Confirmed',
    message: `Congratulations ${title} ${name}! Your identity issuance has been successfully confirmed on the system. Your academy identity is now fully active and ready to use. We\'re excited to have you on ${academyName}!`
})
const ON_FAILURE = (title, name) => ({
    subject: 'Identity Issuance Pending Resolution',
    message: `Hello, ${title} ${name}\nWe encountered a temporary issue with your identity issuance. Our team is reviewing this, and we\'re confident we\'ll have it resolved shortly. Please reach out to support if you need any assistance.`
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

const getProfessorIdentityPayload = async (email) => {
    const { rows: [professor] } = await db.query(
        `SELECT u.email, u.full_name, u.national_id, 
                p.employee_number, p.hire_date, p.rank, p.employment_type, p.title,
                a.wallet_address AS academy_wallet_address, a.name AS academy_name,
                addr.id AS address_id,
                d.is_active AS is_department_active
         FROM users u
         JOIN professors p ON u.id = p.user_id
         JOIN academies a ON p.academy_id = a.id
         JOIN addresses addr ON addr.user_id = u.id
         JOIN departments d ON d.academy_id = a.id
         WHERE u.email = $1`,
        [email]
    )

    if (!professor) {
        const err = new Error('Professor not found')
        err.statusCode = 404
        err.code = 'PROFESSOR_NOT_FOUND'
        throw err
    }

    if (!professor.is_department_active){
        const err = new Error('Professor\'s department is not active')
        err.statusCode = 403
        err.code = 'DEPARTMENT_INACTIVE'
        throw err
    }

    if (!professor.address_id){
        const err = new Error('Professor does not have a registered address')
        err.statusCode = 400
        err.code = 'ADDRESS_NOT_FOUND'
        throw err
    }
    
    return professor;
}

const saveTransaction = async (txHash, payloadObj) => {
    const payload = JSON.stringify(payloadObj)

    await db.query(
        `INSERT INTO pending_transactions (tx_hash, payload)
         VALUES ($1, $2)`,
        [txHash, payload]
    )
}

export const issueProfessorIdentityService = async ({ wallet_address, email }) => {
    const professorWallet = wallet_address

    const professor = await getProfessorIdentityPayload(email)
    
    const tx = await issueProfessorIdentity({
        professorWallet,
        academyWallet: professor.academy_wallet_address.toLowerCase(),

        employeeId: professor.employee_number,
        fullName: professor.full_name,
        nationalId: professor.national_id,

        hireDate: formatDateOnly(professor.hire_date),
        rank: professor.rank,
        employmentType: professor.employment_type
    })

    const payload = {
        wallet_address: professorWallet,
        professor_number: professor.employee_number,
        name: professor.full_name,

        role: 'professor',
        
        email: professor.email,
        onSuccess: ON_SUCCESS(professor.title, professor.full_name, professor.academy_name),
        onFailure: ON_FAILURE(professor.title, professor.full_name)
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
