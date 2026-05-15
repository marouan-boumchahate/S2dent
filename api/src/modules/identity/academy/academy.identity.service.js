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


// Helpers
// -------
const getAcademyByEmail = async (email) => {
    const { rows: [academy] } = await db.query(
        `SELECT id, academy_number, name, short_name, type,
            legal_name, registration_number, tax_id, billing_email, email
        FROM academies
        WHERE email = $1
        LIMIT 1`,
        [email],
    )
    
    if (!academy) {
        const err = new Error('Academy not found with the provided email')
        err.statusCode = 404
        err.code = 'ACADEMY_NOT_FOUND'
        throw err
    }
    
    return academy
}
const getAcademyByWallet = async (wallet) => {
    const { rows: [academy] } = await db.query(
        `SELECT id, academy_number, name, short_name, type,
            legal_name, registration_number, tax_id, billing_email, email
        FROM academies as a
        JOIN identities as i ON i.academy_id = a.id
        WHERE i.wallet = $1
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
        `SELECT 1 FROM identities WHERE wallet = $1 LIMIT 1`,
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
        (wallet, certificate_pem, chain_pem, fingerprint, created_at)
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

const getRandomPublicKey = () => {
    const randomWallet = ethers.Wallet.createRandom()
    return randomWallet.signingKey.publicKey
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

export const issueAcademyIdentity = async ({ wallet, email }) => {
    const checksumAddr = ethers.getAddress(wallet)
    
    await ensureWalletAddressUnique(checksumAddr)
    const academy = await getAcademyByEmail(email)
    await ensureAcademyHasAddress(academy.id)

    const publicKey = getRandomPublicKey() // In a real implementation, I would derive this from the academy's wallet or have them provide it
    
    
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
        publicKey,
        
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
        
        wallet: checksumAddr,
        public_key: publicKey,
        academy_number: academy.academy_number,
        certificate_fingerprint: fingerprint,

        name: academy.name,
        short_name: academy.short_name,

        role: 'academy',
        
        email: academy.email,
        onSuccess: ON_SUCCESS,
        onFailure: ON_FAILURE
    }
    await saveTransaction(tx.hash, payload)
    
    listenOnTransaction(tx)

    
    return {
        academy_wallet: checksumAddr,
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

export const revokeAcademyIdentity = async ({ wallet }) => {
    const checksumAddr = ethers.getAddress(wallet)

    const academy = await getAcademyByWallet(checksumAddr)

    const tx = await revokeAcademy({ walletAddress: checksumAddr })

    // Saving Transaction Off-Chain
    const payload = {
        action: 'revoke',

        wallet: checksumAddr,
        academy_number: academy.academy_number,

        name: academy.name,
        short_name: academy.short_name,

        role: 'academy',

        email: academy.email,
        onSuccess: REVOKE_ON_SUCCESS,
        onFailure: REVOKE_ON_FAILURE
    }
    await saveTransaction(tx.hash, payload)

    listenOnTransaction(tx)

    return {
        academy_wallet: checksumAddr,
        blockchain_transaction: {
            tx_hash: tx.hash,
            status: 'pending',
        }
    }
}