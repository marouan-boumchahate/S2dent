import db from '../../../config/db.js'
import { issueProfessorIdentity } from '../../../blockchain/identity/professor.identity.blockchain.js'
import { listenOnTransaction } from '../../../blockchain/listener.js'
import { getProfessorCertificateAttrs } from '../../../ca/ca.attrs.js'
import { buildIdentityCertificate } from '../../../ca/ca.identity.js'

const RANK_TO_U8 = {
    'Assist. Prof': 0,
    'Assoc. Prof': 1,
    Prof: 2,
    Lecturer: 3,
    Instructor: 4,
}

const EMPLOYMENT_TO_U8 = {
    full_time: 0,
    part_time: 1,
    adjunct: 2,
    visiting: 3,
    contract: 4,
}

const formatDateOnly = (value) => {
    if (!value) return ''
    if (typeof value === 'string') return value.slice(0, 10)
    try {
        return value.toISOString().slice(0, 10)
    } catch {
        return String(value).slice(0, 10)
    }
}

const ensureProfessorCanBeIssued = async (email) => {
    const { rows: [user] } = await db.query(
        `SELECT id, role, is_identity_issued, wallet_address, email, is_active
        FROM users
        WHERE LOWER(email) = LOWER($1)
        LIMIT 1`,
        [email],
    )

    if (!user) {
        const err = new Error('User not found')
        err.statusCode = 404
        err.code = 'USER_NOT_FOUND'
        throw err
    }

    if (user.role !== 'professor') {
        const err = new Error('Only professors can issue a professor identity')
        err.statusCode = 403
        err.code = 'FORBIDDEN'
        throw err
    }

    if (user.is_identity_issued) {
        const err = new Error('Identity has already been issued for this professor')
        err.statusCode = 409
        err.code = 'IDENTITY_ALREADY_ISSUED'
        throw err
    }

    if (user.wallet_address !== null) {
        const err = new Error('User already has a wallet address associated')
        err.statusCode = 409
        err.code = 'WALLET_ADDRESS_ALREADY_ASSOCIATED'
        throw err
    }

    return user
}

const getProfessorBlockchainProfile = async (normalizedEmail) => {
    const { rows: [row] } = await db.query(
        `SELECT
          p.id AS professor_uuid,
          tu.id AS user_uuid,
          p.academy_id AS academy_uuid,
          p.department_id AS department_uuid,
          u.email AS platform_email,
          COALESCE(u.is_active, TRUE) AS platform_is_active,
          tu.first_name,
          tu.middle_name,
          tu.last_name,
          tu.full_name,
          tu.date_of_birth,
          tu.gender::text AS gender,
          tu.national_id,
          tu.email AS personal_email,
          tu.phone,
          tu.photo_url,
          tu.notes,
          ad.address_line1 AS addr_line1,
          ad.address_line2 AS addr_line2,
          ad.street,
          ad.district,
          ad.state,
          ad.postal_code,
          ad.city AS addr_city,
          ad.country AS addr_country,
          ad.latitude::text AS addr_latitude,
          ad.longitude::text AS addr_longitude,
          d.code AS dept_code,
          d.name AS dept_name,
          d.faculty AS dept_faculty,
          d.total_years,
          d.description AS dept_description,
          d.is_active AS dept_is_active,
          p.employee_number,
          p.title,
          p.rank::text AS rank,
          p.specialization,
          p.hire_date,
          p.employment_type::text AS employment_type,
          p.office_location,
          p.office_hours,
          p.bio,
          a.wallet_address AS academy_wallet_address,
          a.name AS academy_name
        FROM users u
        JOIN users tu ON LOWER(tu.email) = LOWER(u.email)
        JOIN professors p ON p.user_id = tu.id
        JOIN academies a ON a.id = p.academy_id
        JOIN departments d ON d.id = p.department_id
        LEFT JOIN addresses ad ON ad.user_id = tu.id AND ad.academy_id IS NULL
        WHERE LOWER(u.email) = LOWER($1)
        LIMIT 1`,
        [normalizedEmail],
    )

    if (!row) {
        const err = new Error('Professor profile not found for user')
        err.statusCode = 404
        err.code = 'PROFESSOR_NOT_FOUND'
        throw err
    }

    return row
}

const ensureAddressReadyForChain = (row) => {
    const city = row.addr_city?.trim?.() ?? ''
    const country = row.addr_country?.trim?.() ?? ''
    if (!city || !country) {
        const err = new Error('A professor address with city and country is required before on-chain identity issuance')
        err.statusCode = 400
        err.code = 'ADDRESS_INCOMPLETE'
        throw err
    }
}

const buildProfessorIssueArgsFromRow = (row) => {
    const rankU8 = RANK_TO_U8[row.rank]
    if (rankU8 === undefined) {
        const err = new Error(`Unknown professor rank for chain: ${row.rank}`)
        err.statusCode = 500
        err.code = 'RANK_MAPPING_ERROR'
        throw err
    }
    const empU8 = EMPLOYMENT_TO_U8[row.employment_type]
    if (empU8 === undefined) {
        const err = new Error(`Unknown employment type for chain: ${row.employment_type}`)
        err.statusCode = 500
        err.code = 'EMPLOYMENT_MAPPING_ERROR'
        throw err
    }
    const genderU8 = row.gender === 'female' ? 1 : 0

    return {
        ids: {
            professorUuid: String(row.professor_uuid),
            userUuid: String(row.user_uuid),
            academyUuid: String(row.academy_uuid),
            departmentUuid: String(row.department_uuid),
        },
        platform: {
            email: row.platform_email,
            isActive: Boolean(row.platform_is_active),
        },
        person: {
            firstName: row.first_name,
            middleName: row.middle_name ?? '',
            lastName: row.last_name,
            fullName: row.full_name,
            dateOfBirth: formatDateOnly(row.date_of_birth),
            gender: genderU8,
            nationalId: row.national_id,
            email: row.personal_email,
            phone: row.phone ?? '',
            photoUrl: row.photo_url ?? '',
            notes: row.notes ?? '',
        },
        addr: {
            addressLine1: row.addr_line1 ?? '',
            addressLine2: row.addr_line2 ?? '',
            street: row.street ?? '',
            district: row.district ?? '',
            state: row.state ?? '',
            postalCode: row.postal_code ?? '',
            city: row.addr_city ?? '',
            country: row.addr_country ?? '',
            latitude: row.addr_latitude ?? '',
            longitude: row.addr_longitude ?? '',
        },
        dept: {
            code: row.dept_code,
            name: row.dept_name,
            faculty: row.dept_faculty,
            totalYears: Number(row.total_years),
            description: row.dept_description ?? '',
            isActive: Boolean(row.dept_is_active),
        },
        job: {
            employeeNumber: row.employee_number,
            title: row.title,
            rank: rankU8,
            specialization: row.specialization ?? '',
            hireDate: formatDateOnly(row.hire_date),
            employmentType: empU8,
            officeLocation: row.office_location ?? '',
            officeHours: row.office_hours ?? '',
            bio: row.bio ?? '',
        },
    }
}

const saveTransaction = async (txHash, user, wallet_address) => {
    const payload = JSON.stringify({
        id: user.id,
        wallet_address,
        email: user.email
    })

    await db.query(
        `INSERT INTO pending_transactions (tx_hash, payload)
         VALUES ($1, $2)`,
        [txHash, payload]
    )
}

const getCertificate = async (
    walletAddress,
    employeeNumber,
    fullName,
    departmentName,
    academyName,
    countryCode,
) => {
    const certAttrs = getProfessorCertificateAttrs(
        walletAddress,
        employeeNumber,
        fullName,
        departmentName,
        academyName,
        countryCode,
    )

    return buildIdentityCertificate({
        walletAddress,
        issuerAddress: academyName,
        uniqueId: employeeNumber,
        certAttrs
    })
}

const saveCertificate = async (
    walletAddress,
    certPem,
    chainPem,
    fingerprint,
) => {
    await db.query(
        `INSERT INTO identity_certificates 
            (wallet_address, certificate_pem, chain_pem, fingerprint, created_at)
        VALUES ($1, $2, $3, $4, NOW())`,
        [walletAddress, certPem, chainPem, fingerprint]
    )
}

export const issueProfessorIdentityService = async ({ wallet_address, email }) => {
    const normalizedWallet = wallet_address.toLowerCase()

    const user = await ensureProfessorCanBeIssued(email)
    const profile = await getProfessorBlockchainProfile(email)
    ensureAddressReadyForChain(profile)

    const issueArgs = buildProfessorIssueArgsFromRow(profile)

    const {
        fingerprint,
        certificatePem,
        chainPem,
        notBefore,
        notAfter
    } = await getCertificate(
        normalizedWallet,
        profile.employee_number,
        profile.full_name,
        profile.dept_name,
        profile.academy_name,
        (profile.addr_country || 'TR').slice(0, 2).toUpperCase(),
    )

    const academyWallet = profile.academy_wallet_address?.toLowerCase?.() ?? profile.academy_wallet_address
    const tx = await issueProfessorIdentity(normalizedWallet, academyWallet, issueArgs)

    await saveCertificate(normalizedWallet, certificatePem, chainPem, fingerprint)
    await saveTransaction(tx.hash, user, normalizedWallet)

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

export { buildProfessorIssueArgsFromRow, getProfessorBlockchainProfile }
