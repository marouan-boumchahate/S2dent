import db from '../../../config/db.js'
import { issueAcademyIdentity as issueAcademy } from '../../../blockchain/identity/academy.identity.blockchain.js'
import { listenOnTransaction } from '../../../blockchain/listener.js'

const ensureAcademyCanBeIssued = async (wallet_address) => {
    const { rows: [user] } = await db.query(
        `SELECT id, role, is_identity_issued, email
        FROM users
        WHERE wallet_address = $1
        LIMIT 1`,
        [wallet_address],
    )

    if (!user) {
        const err = new Error('User not found')
        err.statusCode = 404
        err.code = 'USER_NOT_FOUND'
        throw err
    }

    if (user.role !== 'academy_admin') {
        const err = new Error('Only academy admins can issue an academy identity')
        err.statusCode = 403
        err.code = 'FORBIDDEN'
        throw err
    }

    if (user.is_identity_issued) {
        const err = new Error('Identity has already been issued for this academy')
        err.statusCode = 409
        err.code = 'IDENTITY_ALREADY_ISSUED'
        throw err
    }

    return user;
}

const getAcademy = async (userId) => {
    const { rows: [academy] } = await db.query(
        `SELECT a.academy_number, a.name, a.short_name
            FROM academies a
            JOIN users u ON u.id = a.user_id
            WHERE u.id = $1
            LIMIT 1`,
        [userId],
    )

    if (!academy) {
        const err = new Error('Academy not found for user')
        err.statusCode = 404
        err.code = 'ACADEMY_NOT_FOUND'
        throw err
    }

    return academy
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

export const issueAcademyIdentity = async ({ wallet_address }) => {
    const normalizedWallet = wallet_address.toLowerCase()

    const user = await ensureAcademyCanBeIssued(normalizedWallet)
    
    const academy = await getAcademy(user.id)
    const tx = await issueAcademy(
        normalizedWallet,
        academy.academy_number,
        academy.name,
        academy.short_name
    )

    await saveTransaction(tx.hash, user, normalizedWallet)

    // works at the background, no need to await
    listenOnTransaction(tx)

    return {
        tx_hash: tx.hash,
        status: 'pending'
    }
}