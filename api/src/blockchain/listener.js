import db from '../config/db.js'
import { sendEmail } from '../utils/email.js'

const setTransactionStatus = async (txHash, status) => {
    const { rows: [{ payload }] } = await db.query(
        `UPDATE pending_transactions
            SET status = $1, updated_at = NOW()
            WHERE tx_hash = $2
            RETURNING payload`,
        [status, txHash]
    )

    return { payload }
}

const storeIssuanceInfo = async (txHash, payload) => {
    await db.query(
        `UPDATE users
            SET is_identity_issued = true, identity_tx_hash = $1, wallet_address = $2
            WHERE id = $3`,
        [txHash, payload.wallet_address, payload.id]
    )
}

const successMessage = (email) => {
    return {
        to: email,
        subject: 'Identity Issuance Successful',
        message: 'You are receiving this email because your identity issuance transaction has been confirmed on the blockchain. Your identity is now active and ready to use. Thank you for using S2dent!'
    }
}
const failedMessage = (email) => {
    return {
        to: email,
        subject: 'Identity Issuance Failed',
        message: 'You are receiving this email because your identity issuance transaction has failed. Please try again later.'
    }
}

const notifyUser = async (payload, func) => {
    await sendEmail(func(payload.email))
}

export const listenOnTransaction = (tx) => {
    tx.wait(1) // I'll wait for 3 confirmations in the production environment
        .then(async (receipt) => {
            const { payload } = await setTransactionStatus(tx.hash, 'confirmed')
            await storeIssuanceInfo(tx.hash, payload)

            notifyUser(payload, successMessage)
        })
        .catch(async (err) => {
            const { payload } = await setTransactionStatus(tx.hash, 'failed')

            notifyUser(payload, failedMessage)
        })
}