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


// DTOs
const toSnakeCaseKey = (key) => key.replace(/[A-Z]/g, (match) => `_${match.toLowerCase()}`)
const toIdentityDto = (value) => {
    if (Array.isArray(value)) return value.map(toIdentityDto)
    if (!value || typeof value !== 'object' || value instanceof Date) return value

    return Object.fromEntries(
        Object.entries(value)
              .map(([key, nestedValue]) => [toSnakeCaseKey(key), toIdentityDto(nestedValue)])
    )
}


// Constants
const ON_ISSUE_SUCCESS = (academyName) => ({
    subject: `Identity Issuance Confirmed – Welcome to S2dent, ${academyName}`,
    message: `Dear ${academyName} Team,\n\nWe are pleased to inform you that ${academyName} has been officially issued a verified identity on the S2dent network. Your institution is now fully recognized and active on-chain.\n\nYou may begin onboarding your students and faculty immediately.\n\nShould you have any questions, our support team is available at support@s2dent.io.\n\nRegards,\nThe S2dent Team`
})
const ON_ISSUE_FAILURE = (academyName) => ({
    subject: `Action Required: Identity Issuance Pending – ${academyName}`,
    message: `Dear ${academyName} Team,\n\nWe encountered an issue while processing the identity issuance transaction for ${academyName}. Your identity has not yet been confirmed on the network.\n\nOur engineering team has been notified and is actively investigating. No action is required from your side at this time. We will follow up as soon as the matter is resolved.\n\nIf you have urgent concerns, please contact us at support@s2dent.io.\n\nRegards,\nThe S2dent Team`
})

const ON_REVOKE_SUCCESS = (academyName) => ({
    subject: `Identity Revocation Notice – ${academyName}`,
    message: `Dear ${academyName} Team,\n\nThis is to confirm that the verified identity associated with ${academyName} has been permanently revoked from the S2dent network. Your institution is no longer recognized as an active entity on-chain.\n\nIf this action was authorized, no further steps are required.\n\nIf you believe this was done in error or without your consent, please contact us immediately at support@s2dent.io.\n\nRegards,\nThe S2dent Team`
})
const ON_REVOKE_FAILURE = (academyName) => ({
    subject: `Action Required: Identity Revocation Pending – ${academyName}`,
    message: `Dear ${academyName} Team,\n\nWe encountered an issue while processing the identity revocation request for ${academyName}. The revocation has not yet been finalized on the network.\n\nOur engineering team is investigating and will work to resolve this promptly. We will notify you once the transaction is confirmed.\n\nFor immediate assistance, reach us at support@s2dent.io.\n\nRegards,\nThe S2dent Team`
})


// Helpers
const buildNotification = ({ emailSuccess, emailFailure, emitSuccess, emitFailure, successReceiver, failureReceiver }) => ({
    email: {
        success: emailSuccess,
        failure: emailFailure
    },
    emit: {
        success: emitSuccess ? { message: emitSuccess, receiver: successReceiver } : null,
        failure: emitFailure ? { message: emitFailure, receiver: failureReceiver } : null
    }
})
const fetchFromCache = async (email, otp) => {
    const cacheKey = otpKey(email, otp)
    const cachedData = await getCache(cacheKey)

    if (!cachedData) {
        const err = new Error('Invalid or expired OTP')
        err.statusCode = 400
        err.code = 'INVALID_OTP'
        throw err
    }

    await delCache(cacheKey)

    return JSON.parse(cachedData)
}
const getAcademyById = async (academy_id, role) => {
    if(role !== 'academy') {
        const err = new Error('Academy not found with the provided email')
        err.statusCode = 404
        err.code = 'ACADEMY_NOT_FOUND'
        throw err
    }

    const { rows: [academy] } = await db.query(
        `SELECT a.id, a.academy_number, a.name, a.short_name, a.type,
            a.legal_name, a.registration_number, a.tax_id, a.billing_email, a.email, 
            addr.id AS address_id
        FROM academies AS a
        LEFT JOIN addresses AS addr ON addr.academy_id = a.id
        WHERE a.id = $1
        LIMIT 1`,
        [academy_id],
    )

    if (!academy) {
        const err = new Error('Academy not found with the provided ID')
        err.statusCode = 404
        err.code = 'ACADEMY_NOT_FOUND'
        throw err
    }

    if(!academy.address_id) {
        const err = new Error('Academy address is required before issuing an identity. Please add an address to your academy profile.')
        err.statusCode = 409
        err.code = 'ACADEMY_ADDRESS_REQUIRED'
        throw err
    }
    
    return academy
}
const getAcademyByWallet = async (wallet) => {
    const { rows: [academy] } = await db.query(
        `SELECT a.id, academy_number, name, short_name, type,
            legal_name, registration_number, tax_id, billing_email, email,
            i.wallet_address, i.public_key
        FROM academies as a
        JOIN identities as i ON i.academy_id = a.id
        WHERE i.wallet_address = $1
        LIMIT 1`,
        [wallet],
    )
    
    if (!academy) {
        const err = new Error('Academy not found with the provided wallet address')
        err.statusCode = 404
        err.code = 'ACADEMY_NOT_FOUND'
        throw err
    }
    
    return academy
}
const ensureAcademyHasAddress = async (academyId) => {
    const { rows } = await db.query(
        `SELECT 1
        FROM addresses
        WHERE academy_id = $1
        LIMIT 1`,
        [academyId],
    )
    
    if (rows.length === 0) {
        const err = new Error('Academy address not found')
        err.statusCode = 409
        err.code = 'ACADEMY_ADDRESS_REQUIRED'
        throw err
    }
}
const saveTransaction = async (txHash, payloadObj) => {
    const payload = JSON.stringify(payloadObj)
    
    await db.query(
        `INSERT INTO pending_transactions (tx_hash, payload)
        VALUES ($1, $2)`,
        [txHash, payload]
    )
}
const ensureWalletAddressUnique = async (wallet) => 
{
    const { rows } = await db.query(
        `SELECT 1 FROM identities WHERE wallet_address = $1 LIMIT 1`,
        [wallet]
    );

    if(rows.length > 0) {
        const err = new Error('Wallet address is already associated with an existing identity')
        err.statusCode = 409
        err.code = 'WALLET_ADDRESS_NOT_UNIQUE'
        throw err
    }
}
const insertIdentityRecord = async ({ academyId, issueTxHash }) => {
    await db.query(
        `INSERT INTO identities
        (academy_id, role, issue_identity_tx_hash)
        VALUES ($1, $2, $3)`,
        [academyId, "academy", issueTxHash]
    )
}
const updateIdentityRecord = async (revokeTxHash, walletAddress) => {
    await db.query(
        `UPDATE identities
            SET revoke_identity_tx_hash = $1, updated_at = NOW()
            WHERE wallet_address = $2`,
        [revokeTxHash, walletAddress]
    )
}

const saveCertificate = async (walletAddress, certPem, chainPem, fingerprintHex) => {
    await db.query(
        `INSERT INTO identity_certificates
        (wallet_address, certificate_pem, chain_pem, fingerprint, created_at)
        VALUES ($1, $2, $3, $4, NOW())`,
        [walletAddress, certPem, chainPem, fingerprintHex]
    )
}
const getCertificate = async (
    walletAddress,
    academy_number,
    academy_name,
    academy_short_name
) => {
    const certAttrs = getAcademyCertificateAttrs(
        walletAddress,
        academy_number,
        academy_name,
        academy_short_name
    )
    
    const certificate = await buildIdentityCertificate({ 
        walletAddress, 
        issuerAddress: null, // because the issuer is the app CA (DOES NOT HAVE A WALLET))
        uniqueId: academy_number,
        certAttrs
    })
    
    return certificate
}
const validateWalletAddress = (walletAddress) => {
    try {
        return ethers.getAddress(walletAddress)
    } catch {
        const err = new Error('Invalid wallet address')
        err.statusCode = 400
        err.code = 'INVALID_ADDRESS'
        throw err
    }
}
const getAcademyWalletByUserId = async (academyId) => {
    const { rows: [identity] } = await db.query(
        `SELECT wallet_address
         FROM identities
         WHERE academy_id = $1
           AND role = 'academy'
         LIMIT 1`,
        [academyId]
    )

    if (!identity?.wallet_address) {
        const err = new Error('Academy identity not found')
        err.statusCode = 404
        err.code = 'ACADEMY_IDENTITY_NOT_FOUND'
        throw err
    }

    return identity.wallet_address
}


// Services
const issueAcademyIdentity = async ({ otp, email, signature }) => {   
    const { id, message, role } = await fetchFromCache(email, otp)

    const academy = await getAcademyById(id, role)
    const { signerPublicKey, signerAddress } = recoverSigner(message, signature)

    const checksumAddr = ethers.getAddress(signerAddress)
    await ensureWalletAddressUnique(checksumAddr)
    
    const {
        fingerprint,
        certificatePem,
        chainPem,
        notBefore,
        notAfter
    } = await getCertificate(
        checksumAddr,
        academy.academy_number,
        academy.name,
        academy.short_name
    )
    
    const tx = await issueAcademy({
        academyAddress: checksumAddr,
        publicKey: signerPublicKey,
        
        academyNumber: academy.academy_number,
        name: academy.name,
        shortName: academy.short_name,
        academyType: academy.type,
        
        legalName: academy.legal_name,
        registrationNumber: academy.registration_number,
        taxId: academy.tax_id,
        billingEmail: academy.billing_email ?? '',

        fingerprint,
        certificatePem,
        chainPem,
        notBefore,
        notAfter
    })
    
    await saveCertificate(checksumAddr, certificatePem, chainPem, fingerprint)
    await insertIdentityRecord({
        academyId: id,
        issueTxHash: tx.hash
    })

    // Saving Transaction Off-Chain
    const emailSuccess = ON_ISSUE_SUCCESS(academy.name)
    const emailFailure = ON_ISSUE_FAILURE(academy.name)

    const notification = buildNotification({
        emailSuccess,
        emailFailure,
        emitSuccess: null,
        emitFailure: null,
        successReceiver: null,
        failureReceiver: null
    })

    const payload = {
        action: 'identity_issue',
        
        wallet_address: checksumAddr,
        public_key: signerPublicKey,
        
        email: academy.email,
        notification
    }
    await saveTransaction(tx.hash, payload)

    
    listenOnTransaction(tx)
    
    return {
        academy_address: checksumAddr,
        blockchain_transaction: {
            tx_hash: tx.hash,
            status: 'pending',
        },
        certificate_metadata: {
            certificate_hash: fingerprint,
            issued_at: notBefore,
            expires_at: notAfter
        }
    }
}
const revokeAcademyIdentity = async ({ wallet_address, reason }) => {
    const checksumAddr = ethers.getAddress(wallet_address)

    const academy = await getAcademyByWallet(checksumAddr)

    const tx = await revokeAcademy({ academyAddress: academy.wallet_address, reason })
    await updateIdentityRecord(tx.hash, checksumAddr)

    // Saving Transaction Off-Chain
    const emailSuccess = ON_REVOKE_SUCCESS(academy.name)
    const emailFailure = ON_REVOKE_FAILURE(academy.name)

    const notification = buildNotification({
        emailSuccess,
        emailFailure,
        emitSuccess: null,
        emitFailure: null,
        successReceiver: null,
        failureReceiver: null
    })
    
    const payload = {
        action: 'identity_revoke',

        wallet_address: checksumAddr,
        reason,

        email: academy.email,
        notification
    }
    await saveTransaction(tx.hash, payload)

    listenOnTransaction(tx)

    return {
        academy_address: checksumAddr,
        blockchain_transaction: {
            tx_hash: tx.hash,
            status: 'pending',
        }
    }
}
const fetchAcademyIdentityByWalletService = async (walletAddress) => {
    const checksumAddr = validateWalletAddress(walletAddress)
    const identity = await getAcademyIdentity(checksumAddr)

    if (!identity) {
        const err = new Error('Academy identity not found')
        err.statusCode = 404
        err.code = 'ACADEMY_IDENTITY_NOT_FOUND'
        throw err
    }

    return {
        wallet_address: checksumAddr,
        ...toIdentityDto(identity),
    }
}
const fetchAcademyIdentityByIdService = async (academyId) => {
    const walletAddress = await getAcademyWalletByUserId(academyId)
    return fetchAcademyIdentityByWalletService(walletAddress)
}


export { 
    issueAcademyIdentity, 
    revokeAcademyIdentity, 
    fetchAcademyIdentityByWalletService, 
    fetchAcademyIdentityByIdService 
}