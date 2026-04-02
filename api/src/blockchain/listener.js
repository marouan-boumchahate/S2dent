import db from '../config/db.js'
import { sendEmail } from '../utils/email.js'
import { emitToUser } from '../config/socket.js'

const setTransactionStatus = async (txHash, status) => {
    const { rows: [{ payload, records_to_delete }] } = await db.query(
        `UPDATE pending_transactions
            SET status = $1, updated_at = NOW()
            WHERE tx_hash = $2
            RETURNING payload, records_to_delete`,
        [status, txHash]
    )

    return { payload, records_to_delete }
}

const deleteRecords = async (recordsToDelete) => {
    for (const record of recordsToDelete) {
        console.log("=> I'm deleting: ", record)
        await db.query(`DELETE FROM ${record.table} WHERE id = $1`, [record.id])
    }
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
            const { payload, records_to_delete } = await setTransactionStatus(tx.hash, 'confirmed')
            await deleteRecords(records_to_delete.records)

            emitToUser(payload.wallet_address, 'identity:confirmed', {
                tx_hash: tx.hash,
                status: 'confirmed'
            })
            await notifyUser(payload, successMessage)
        })
        .catch(async (err) => {
            const { payload } = await setTransactionStatus(tx.hash, 'failed')

            emitToUser(payload.wallet_address, 'identity:failed', {
                tx_hash: tx.hash,
                status: 'failed',
                reason: err.message
            })
            await notifyUser(payload, failedMessage)

            console.log(`\n\n=> ${err.message} <=`)
        })
}