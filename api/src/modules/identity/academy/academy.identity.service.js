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
// -------
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


// Issuance
// --------
const ON_SUCCESS = {
    subject: 'Identity Issuance Confirmed',
    message: 'Congratulations! Your identity issuance has been successfully confirmed on the system. Your academy identity is now fully active and ready to use. We\'re excited to have you on S2dent!'
}
const ON_FAILURE = {
    subject: 'Identity Issuance Pending Resolution',
    message: 'We encountered a temporary issue with your identity issuance transaction. Our team is reviewing this, and we\'re confident we\'ll have it resolved shortly. Please reach out to support if you need any assistance.'
}

export const issueAcademyIdentity = async ({ otp, email, signature }) => {   
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
    
    // Saving Transaction Off-Chain
    const payload = {
        action: 'issue',
        
        entity_id: id,
        wallet_address: checksumAddr,
        public_key: signerPublicKey,
        role: 'academy',
        
        email: academy.email,
        onSuccess: ON_SUCCESS,
        onFailure: ON_FAILURE
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

// Revocation
// ----------
const REVOKE_ON_SUCCESS = {
    subject: 'Identity Revocation Confirmed',
    message: 'Your academy identity has been revoked from the system and is no longer active. If this action was unexpected, please reach out to support immediately.'
}
const REVOKE_ON_FAILURE = {
    subject: 'Identity Revocation Pending Resolution',
    message: 'We encountered a temporary issue with your identity revocation transaction. Our team is reviewing this, and we\'re confident we\'ll have it resolved shortly. Please reach out to support if you need any assistance.'
}

export const revokeAcademyIdentity = async ({ wallet_address, reason }) => {
    const checksumAddr = ethers.getAddress(wallet_address)

    const academy = await getAcademyByWallet(checksumAddr)

    const tx = await revokeAcademy({ academyAddress: academy.wallet_address, reason })

    // Saving Transaction Off-Chain
    const payload = {
        action: 'revoke',

        wallet_address: checksumAddr,
        reason,

        email: academy.email,
        onSuccess: REVOKE_ON_SUCCESS,
        onFailure: REVOKE_ON_FAILURE
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