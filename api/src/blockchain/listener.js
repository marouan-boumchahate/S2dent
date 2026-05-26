import db from '../config/db.js'
import { sendEmail } from '../utils/email.js'
import { emitToUser } from '../config/socket.js'

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

const saveIdentityOffChain = async ({ 
    wallet_address, 
    public_key,
    issue_identity_tx_hash
}) => {
    await db.query(
        `UPDATE identities
            SET wallet_address = $2, 
                public_key = $3,
                issued_at = NOW(),
                status = 'issued',
                updated_at = NOW()
            WHERE issue_identity_tx_hash = $1`,
        [issue_identity_tx_hash, wallet_address, public_key]
    )
}
const revokeIdentityOffChain = async ({ wallet_address, reason }) => {
    await db.query(
        `UPDATE identities
            SET revoked_at = NOW(), updated_at = NOW(), revocation_reason = $2, status = 'revoked'
            WHERE wallet_address = $1`,
        [wallet_address, reason]
    )
}

const deactivateStudentOffChain = async ({ user_id }) => {
    await db.query(
        `UPDATE students
            SET enrollment_status = 'inactive', updated_at = NOW()
            WHERE user_id = $1`,
        [user_id]
    )
}
const deactivateProfessorOffChain = async ({ user_id }) => {
    await db.query(
        `UPDATE professors
            SET is_active = FALSE, updated_at = NOW()
            WHERE user_id = $1`,
        [user_id]
    )
}

const saveCredentialOffChain = async ({ credential_code, credential_index, issue_credential_tx_hash }) => {
    await db.query(`
        UPDATE credentials
        SET issue_tx_hash = $2, issued_at = NOW(), credential_index = $3, updated_at = NOW()
        WHERE code = $1
        `, [credential_code, issue_credential_tx_hash, credential_index]
    );
}
const revokeCredentialOffChain = async ({ credential_code, revocation_reason, revoke_credential_tx_hash }) => {
    await db.query(`
        UPDATE credentials
        SET revoke_tx_hash = $2, revoked_at = NOW(), revocation_reason = $3, updated_at = NOW()
        WHERE code = $1
        `, [credential_code, revoke_credential_tx_hash, revocation_reason]
    );
}

const performAction = async (payload, tx_hash, receipt) => {
    switch(payload.action) {
        case 'identity_issue':
            await saveIdentityOffChain({
                wallet_address: payload.wallet_address,
                public_key: payload.public_key,
                issue_identity_tx_hash: tx_hash
            })
            break
        case 'identity_revoke':
            await revokeIdentityOffChain({
                wallet_address: payload.wallet_address,
                reason: payload.reason
            })
            if (payload.role === 'student') 
                await deactivateStudentOffChain({ user_id: payload.user_id })
            else if (payload.role === 'professor') 
                await deactivateProfessorOffChain({ user_id: payload.user_id })
            break
        case 'credential_issue':
            const credential_index = parseInt(receipt.logs[0].args[3])

            await saveCredentialOffChain({
                credential_code: payload.credential_code,
                issue_credential_tx_hash: tx_hash,
                credential_index
            })
            break
        case 'credential_revoke':
            await revokeCredentialOffChain({
                credential_code: payload.credential_code,
                revocation_reason: payload.revocation_reason,
                revoke_credential_tx_hash: tx_hash
            })
            break
        default:
            console.warn(`Unknown action: ${payload.action}`)
    }
}

const notifyUser = ({
    email,
    subject,
    message
}) => {
    void sendEmail({ to: email, subject, message })
}

export const listenOnTransaction = (tx) => {
    tx.wait(1) // Wait for a block confirmation
        .then(async (receipt) => {
            const { payload } = await setTransactionStatus(tx.hash, 'verified')
            const notification = payload.notification ?? {
                email: {
                    success: payload.onSuccess,
                    failure: payload.onFailure
                },
                emit: {
                    success: payload.onSuccessEmit,
                    failure: payload.onFailureEmit
                }
            }

            //console.log('Logs of the transaction receipt:', receipt.logs)
            await performAction(payload, tx.hash, receipt)

            if (notification.emit?.success?.message) {
                const { emit: { success: { receiver, message } } } = notification

                emitToUser(receiver, 'notification', {
                    tx_hash: tx.hash,
                    status: 'verified',
                    message,
                    created_at: new Date().toISOString()
                })
            }
            if (notification.email?.success) {
                const { email: { success: { subject, message } } } = notification

                notifyUser({
                    email: payload.email,
                    subject,
                    message
                })
            }
        })
        .catch(async (err) => {
            const { payload } = await setTransactionStatus(tx.hash, 'failed')
            const notification = payload.notification ?? {
                email: {
                    success: payload.onSuccess,
                    failure: payload.onFailure
                },
                emit: {
                    success: payload.onSuccessEmit,
                    failure: payload.onFailureEmit
                }
            }

            //console.error('Error processing transaction:', err)

            if (notification.emit?.failure?.message) {
                const { emit: { failure: { receiver, message } } } = notification

                emitToUser(receiver, 'notification', {
                    tx_hash: tx.hash,
                    status: 'failed',
                    message,
                    created_at: new Date().toISOString(),
                    reason: err.message
                })
            }
            if (notification.email?.failure) {
                const { email: { failure: { subject, message } } } = notification

                notifyUser({
                    email: payload.email,
                    subject,
                    message
                })
            }
        })
}