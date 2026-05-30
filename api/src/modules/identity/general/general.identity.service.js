import db from '../../../config/db.js'
import { ethers } from 'ethers'
import {
    issueAcademyIdentity as issueAcademy,
    revokeAcademyIdentity as revokeAcademy,
    getAcademyIdentity
} from '../../../blockchain/identity/academy.identity.blockchain.js'
import { listenOnTransaction } from '../../../blockchain/listener.js'
import { getAcademyCertificateAttrs } from '../../../ca/ca.attrs.js'
import { buildIdentityCertificate } from '../../../ca/ca.identity.js'
import { getCache, delCache } from '../../../cache/cache.client.js'
import { otpKey } from '../../../cache/cache.keys.js'
import { recoverSigner } from '../../../utils/crypto.js'


// Helpers
const getWaitingIdentitiesByAcademy = async (academy_id) => {
    const { rows } = await db.query(`
        SELECT *, 'waiting' AS status
        FROM (
            SELECT
                i.wallet_address,
                i.role,
                u.full_name,
                u.email
            FROM identities i
            JOIN users u ON i.user_id = u.id
            JOIN students s ON s.user_id = u.id
            WHERE s.academy_id = $1
              AND i.role = 'student'
              AND i.issue_identity_tx_hash IS NULL

            UNION ALL

            SELECT
                i.wallet_address,
                i.role,
                u.full_name,
                u.email
            FROM identities i
            JOIN users u ON i.user_id = u.id
            JOIN professors p ON p.user_id = u.id
            WHERE p.academy_id = $1
              AND i.role = 'professor'
              AND i.issue_identity_tx_hash IS NULL
        ) waiting_identities
        ORDER BY full_name ASC
    `, [academy_id]
    )

    return rows;
}


// Services
const fetchWaitingIdentitiesService = async (academy_id) => {
    return getWaitingIdentitiesByAcademy(academy_id)
}


export { fetchWaitingIdentitiesService }