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

const saveIdentityOffChain = async ({ wallet_address, role, entity_id, issue_identity_tx_hash, public_key }) => {
    await db.query(
        `INSERT INTO identities 
            (wallet_address, role, ${role === 'academy' ? 'academy_id' : 'user_id'}, issue_identity_tx_hash, public_key, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [wallet_address, role, entity_id, issue_identity_tx_hash, public_key]
    )
}
const revokeIdentityOffChain = async ({ wallet_address, revoke_identity_tx_hash }) => {
    await db.query(
        `UPDATE identities
            SET is_active = FALSE, revoke_identity_tx_hash = $2, updated_at = NOW()
            WHERE wallet_address = $1`,
        [wallet_address, revoke_identity_tx_hash]
    )
}

const saveCredentialOffChain = async ({ credential_code, credential_index, issue_credential_tx_hash }) => {
    await db.query(`
        UPDATE credentials
        SET issue_tx_hash = $2, issued_at = NOW(), status = 'issued', credential_index = $3
        WHERE code = $1
        `, [credential_code, issue_credential_tx_hash, credential_index]
    );
}
const revokeCredentialOffChain = async ({ credential_code, revocation_reason, revoke_credential_tx_hash }) => {
    await db.query(`
        UPDATE credentials
        SET revoke_tx_hash = $2, revoked_at = NOW(), status = 'revoked', revocation_reason = $3
        WHERE credential_code = $1
        `, [credential_code, revoke_credential_tx_hash, revocation_reason]
    );
}

const performAction = async (payload, tx_hash, receipt) => {
    switch(payload.action) {
        case 'issue':
            await saveIdentityOffChain({
                wallet_address: payload.wallet_address,
                public_key: payload.public_key,
                role: payload.role,
                entity_id: payload.entity_id,
                issue_identity_tx_hash: tx_hash
            })
            break
        case 'revoke':
             await revokeIdentityOffChain({
                wallet_address: payload.wallet_address,
                revoke_identity_tx_hash: tx_hash
            })
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

const notifyUser = async ({
    email,
    subject,
    message
}) => {
    await sendEmail({ to: email, subject, message })
}

export const listenOnTransaction = (tx) => {
    tx.wait(1) // Wait for a block confirmation
        .then(async (receipt) => {
            const { payload } = await setTransactionStatus(tx.hash, 'confirmed')

            await performAction(payload, tx.hash, receipt)

            emitToUser(payload.wallet_address, 'identity:confirmed', {
                tx_hash: tx.hash,
                status: 'confirmed'
            })
            await notifyUser({
                email: payload.email,
                subject: payload.onSuccess.subject,
                message: payload.onSuccess.message
            })
        })
        .catch(async (err) => {
            const { payload } = await setTransactionStatus(tx.hash, 'failed')

            console.error('Error processing transaction:', err)

            emitToUser(payload.wallet_address, 'identity:failed', {
                tx_hash: tx.hash,
                status: 'failed',
                reason: err.message
            })
            await notifyUser({
                email: payload.email,
                subject: payload.onFailure.subject,
                message: payload.onFailure.message
            })
        })
}