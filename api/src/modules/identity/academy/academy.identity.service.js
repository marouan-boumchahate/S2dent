import db from '../../../config/db.js'
import { issueAcademyIdentity as issueAcademy } from '../../../blockchain/identity/academy.identity.blockchain.js'
import { listenOnTransaction } from '../../../blockchain/listener.js'
import { getAcademyCertificateAttrs } from '../../../ca/ca.attrs.js'
import { buildIdentityCertificate } from '../../../ca/ca.identity.js'

// academy_type enum order must match AcademyIdentity.AcademyType (uint8).
const ACADEMY_TYPE_TO_UINT8 = {
    university: 0,
    college: 1,
    school: 2,
    institute: 3,
    online_platform: 4,
    other: 5,
}

const getAcademyByWallet = async (wallet_address) => {
    const { rows: [academy] } = await db.query(
        `SELECT id, wallet_address, academy_number, name, short_name, type,
                description, website, logo_url, email, phone,
                legal_name, registration_number, tax_id, billing_email
         FROM academies
         WHERE wallet_address = $1
         LIMIT 1`,
        [wallet_address],
    )

    if (!academy) {
        const err = new Error('Academy not found for wallet address')
        err.statusCode = 404
        err.code = 'ACADEMY_NOT_FOUND'
        throw err
    }

    return academy
}

const getAcademyAddress = async (academyId) => {
    const { rows: [address] } = await db.query(
        `SELECT *
         FROM addresses
         WHERE academy_id = $1
         LIMIT 1`,
        [academyId],
    )

    if (!address) {
        const err = new Error('Academy address not found')
        err.statusCode = 409
        err.code = 'ACADEMY_ADDRESS_REQUIRED'
        throw err
    }

    return address
}

const saveTransaction = async (txHash, payloadObj, recordsToDeleteObj) => {
    const payload = JSON.stringify(payloadObj)

    await db.query(
        `INSERT INTO pending_transactions (tx_hash, payload, records_to_delete)
         VALUES ($1, $2, $3)`,
        [txHash, payload, recordsToDeleteObj]
    )
}

const saveCertificate = async (walletAddress, certPem, chainPem, fingerprintHex) => {
    const { rows: [{ id }] } = await db.query(
        `INSERT INTO identity_certificates
            (wallet_address, certificate_pem, chain_pem, fingerprint, created_at)
        VALUES ($1, $2, $3, $4, NOW())
        RETURNING id;`,
        [walletAddress, certPem, chainPem, fingerprintHex]
    )

    return id
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

export const issueAcademyIdentity = async ({ wallet_address }) => {
    const normalizedWallet = wallet_address.toLowerCase()

    const academy = await getAcademyByWallet(normalizedWallet)
    const address = await getAcademyAddress(academy.id)

    const {
        fingerprint,
        certificatePem,
        chainPem,
        notBefore,
        notAfter
    } = await getCertificate(
        normalizedWallet,
        academy.academy_number,
        academy.name,
        academy.short_name
    )

    const tx = await issueAcademy({
        walletAddress: normalizedWallet,
        academyNumber: academy.academy_number,
        name: academy.name,
        shortName: academy.short_name,
        academyType: ACADEMY_TYPE_TO_UINT8[academy.type],
        description: academy.description ?? '',
        website: academy.website ?? '',
        logoUrl: academy.logo_url ?? '',
        email: academy.email,
        phone: academy.phone ?? '',
        legalName: academy.legal_name,
        registrationNumber: academy.registration_number,
        taxId: academy.tax_id,
        billingEmail: academy.billing_email ?? '',
        addressLine1: address.address_line1 ?? '',
        addressLine2: address.address_line2 ?? '',
        street: address.street ?? '',
        district: address.district ?? '',
        state: address.state ?? '',
        postalCode: address.postal_code ?? '',
        city: address.city,
        country: address.country,
        latitude: address.latitude != null ? String(address.latitude) : '',
        longitude: address.longitude != null ? String(address.longitude) : '',
        fingerprint,
        certificatePem,
        chainPem,
        notBefore,
        notAfter,
    })

    const certificate_id = await saveCertificate(normalizedWallet, certificatePem, chainPem, fingerprint)

    // Saving Transaction Information
    const payload = {
        wallet_address: normalizedWallet,
        academy_number: academy.academy_number,
        name: academy.name,
        short_name: academy.short_name,
        email: academy.email,
        certificate_fingerprint: fingerprint,
    }
    const recordsToDelete = {
        records: [
            {table: "addresses", id: address.id},
            {table: "academies", id: academy.id},
            {table: "identity_certificates", id: certificate_id}
        ]
    }
    await saveTransaction(tx.hash, payload, recordsToDelete)

    listenOnTransaction(tx)

    return {
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