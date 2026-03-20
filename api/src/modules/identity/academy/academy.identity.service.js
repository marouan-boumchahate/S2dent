import db from '../../../config/db.js'
import { issueAcademyIdentity as issueAcademy } from '../../../blockchain/identity/academy.identity.blockchain.js'

const ensureAcademyCanBeIssued = async (wallet_address) => {
    const { rows: [user] } = await db.query(
        `SELECT id, role, is_identity_issued
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
        `SELECT a.id, a.name, a.short_name
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

const setIssuanceData = async (userId, walletAddress, txHash) => {
    const { rows: [updated] } = await db.query(
        `UPDATE users
            SET wallet_address = $1,
                identity_tx_hash = $2,
                is_identity_issued = TRUE,
                updated_at = NOW()
        WHERE id = $3
        RETURNING id, email, role, wallet_address, identity_tx_hash, is_identity_issued`,
        [walletAddress, txHash, userId],
    )

    return {
        wallet_address: updated.wallet_address,
        email: updated.email,
        role: updated.role,
        identity_tx_hash: updated.identity_tx_hash,
        is_identity_issued: updated.is_identity_issued,
    }
}

export const issueAcademyIdentity = async ({ wallet_address }) => {
    const normalizedWallet = wallet_address.toLowerCase()

    const user = await ensureAcademyCanBeIssued(normalizedWallet)
    
    const academy = await getAcademy(user.id)
    const txHash = await issueAcademy(
        normalizedWallet,
        academy.id,
        academy.name,
        academy.short_name
    )

    const updatedDto = await setIssuanceData(
        user.id,
        normalizedWallet,
        txHash
    )

    return updatedDto;
}