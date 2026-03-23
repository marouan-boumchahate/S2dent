import db from '../../../config/db.js'
import { issueProfessorIdentity } from '../../../blockchain/identity/professor.identity.blockchain.js'
import { listenOnTransaction } from '../../../blockchain/listener.js'

const ensureProfessorCanBeIssued = async (email) => {
    const { rows: [user] } = await db.query(
        `SELECT id, role, is_identity_issued, wallet_address, email
        FROM users
        WHERE email = $1
        LIMIT 1`,
        [email],
    )

    if (!user) {
        const err = new Error('User not found')
        err.statusCode = 404
        err.code = 'USER_NOT_FOUND'
        throw err
    }

    if (user.role !== 'professor') {
        const err = new Error('Only professors can issue a professor identity')
        err.statusCode = 403
        err.code = 'FORBIDDEN'
        throw err
    }

    if (user.is_identity_issued) {
        const err = new Error('Identity has already been issued for this professor')
        err.statusCode = 409
        err.code = 'IDENTITY_ALREADY_ISSUED'
        throw err
    }

    if(user.wallet_address !== null) {
        const err = new Error('User already has a wallet address associated')
        err.statusCode = 409
        err.code = 'WALLET_ADDRESS_ALREADY_ASSOCIATED'
        throw err
    }

    return user;
}

const getProfessor = async (userId) => {
    const { rows: [professor] } = await db.query(
        `SELECT p.id, p.full_name, p.employee_number, p.department, p.title, p.faculty, au.wallet_address as academy_wallet_address
            FROM professors p
            JOIN users pu ON pu.id = p.user_id
            JOIN academies a ON a.id = p.academy_id
            JOIN users au ON au.id = a.user_id
            WHERE pu.id = $1
            LIMIT 1`,
        [userId],
    )

    if (!professor) {
        const err = new Error('Professor not found for user')
        err.statusCode = 404
        err.code = 'PROFESSOR_NOT_FOUND'
        throw err
    }

    return professor
}

const saveTransaction = async (txHash, user, wallet_address) => {
    const payload = JSON.stringify({ 
        id: user.id, 
        wallet_address, 
        email: user.email 
    })

    await db.query(
        `INSERT INTO pending_transactions (tx_hash, payload)
         VALUES ($1, $2)`,
        [txHash, payload]
    )
}

export const issueProfessorIdentityService = async ({ wallet_address, email }) => {
    const normalizedWallet = wallet_address.toLowerCase()

    const user = await ensureProfessorCanBeIssued(email)

    const professor = await getProfessor(user.id)
    const tx = await issueProfessorIdentity(
        normalizedWallet, 
        professor.employee_number,
        professor.full_name,
        professor.title,
        professor.department,
        professor.faculty,
        professor.academy_wallet_address
    )

    await saveTransaction(tx.hash, user, normalizedWallet)

    // works at the background, no need to await
    listenOnTransaction(tx)

    return {
        tx_hash: tx.hash,
        status: 'pending'
    }
}