import { ethers } from 'ethers'
import { env } from '../../config/env.js'
import { platformWallet } from '../../config/blockchain.js'
import S2dentABI from '../contracts/S2dent.json' with { type: 'json' }

const blockchain = env.blockchain

const getContract = () =>
    new ethers.Contract(
        blockchain.deployedContractAddress,
        S2dentABI.abi,
        platformWallet
    )

const toUnixSeconds = (value) => {
    if (value instanceof Date)
        return Math.floor(value.getTime() / 1000)

    return Math.floor(new Date(value).getTime() / 1000)
}

// Ethers v6 returns gas estimates as bigint. Keep this margin as integers.
const GAS_MARGIN_NUM = 120n; // +20%
const GAS_MARGIN_DEN = 100n;

/**
 * @param {string} walletAddress
 * @param {string} academyAddress - Academy wallet (`academies.wallet_address`); stored as `issuer` on-chain.
 * @param {object} issueArgs - Professor profile payload coming from DB. Expected keys:
 *   (`person`, `addr`, `dept`, `job`, `cert`). Extra keys are ignored.
 */
const issueProfessorIdentity = async (walletAddress, academyAddress, issueArgs) => {
    try {
        const contract = getContract()

        const person = issueArgs?.person ?? {}
        const addr = issueArgs?.addr ?? {}
        const dept = issueArgs?.dept ?? {}
        const job = issueArgs?.job ?? {}
        const cert = issueArgs?.cert ?? {}

        // Compute proof hashes off-chain to keep the on-chain state compact.
        // These must match Solidity: keccak256(abi.encodePacked(...)).
        const nationalIdHash = ethers.solidityPackedKeccak256(
            ['string'],
            [person.nationalId ?? '']
        )

        const personHash = ethers.solidityPackedKeccak256(
            ['string', 'string', 'string', 'string', 'string', 'uint8', 'string', 'string', 'string', 'string', 'string'],
            [
                person.firstName ?? '',
                person.middleName ?? '',
                person.lastName ?? '',
                person.fullName ?? '',
                person.dateOfBirth ?? '',
                Number(person.gender ?? 0),
                person.nationalId ?? '',
                person.email ?? '',
                person.phone ?? '',
                person.photoUrl ?? '',
                person.notes ?? '',
            ]
        )

        const addressHash = ethers.solidityPackedKeccak256(
            ['string', 'string', 'string', 'string', 'string', 'string', 'string', 'string', 'string', 'string'],
            [
                addr.addressLine1 ?? '',
                addr.addressLine2 ?? '',
                addr.street ?? '',
                addr.district ?? '',
                addr.state ?? '',
                addr.postalCode ?? '',
                addr.city ?? '',
                addr.country ?? '',
                addr.latitude ?? '',
                addr.longitude ?? '',
            ]
        )

        const deptHash = ethers.solidityPackedKeccak256(
            ['string', 'string', 'string', 'uint256', 'bool', 'string'],
            [
                dept.code ?? '',
                dept.name ?? '',
                dept.faculty ?? '',
                BigInt(Number(dept.totalYears ?? 0)),
                Boolean(dept.isActive ?? true),
                dept.description ?? '',
            ]
        )

        const jobHash = ethers.solidityPackedKeccak256(
            ['string', 'string', 'uint8', 'string', 'string', 'string', 'string', 'uint8', 'string'],
            [
                job.employeeNumber ?? '',
                job.title ?? '',
                Number(job.rank ?? 0),
                job.specialization ?? '',
                job.hireDate ?? '',
                job.officeLocation ?? '',
                job.officeHours ?? '',
                Number(job.employmentType ?? 0),
                job.bio ?? '',
            ]
        )

        const certificateHash = ethers.solidityPackedKeccak256(['string'], [cert.certificatePem ?? ''])
        const chainHash = ethers.solidityPackedKeccak256(['string'], [cert.chainPem ?? ''])

        const args = {
            infos: {
                employeeNumber: job.employeeNumber,
                nationalIdHash,
                rank: job.rank,
                employmentType: job.employmentType,
            },
            proofs: {
                personHash,
                deptHash,
                jobHash,
                addressHash,
            },
            cert: {
                fingerprint: cert.fingerprint,
                certificateHash,
                chainHash,
                notBefore: BigInt(toUnixSeconds(cert.notBefore)),
                notAfter: BigInt(toUnixSeconds(cert.notAfter)),
            }
        }

        const params = [walletAddress, academyAddress, args]

        const gasEstimate = await contract.issueProfessorIdentity.estimateGas(...params)
        const gasLimit = (typeof gasEstimate === 'bigint')
            ? (gasEstimate * GAS_MARGIN_NUM) / GAS_MARGIN_DEN
            : gasEstimate.mul(GAS_MARGIN_NUM).div(GAS_MARGIN_DEN)

        const tx = await contract.issueProfessorIdentity(...params, { gasLimit })
        return tx
    } catch (err) {
        const reason = err?.reason ?? err?.shortMessage ?? err?.message ?? 'Unknown blockchain error'
        const wrapped = new Error(`issueProfessorIdentity failed: ${reason}`)
        wrapped.statusCode = 502
        wrapped.code = 'BLOCKCHAIN_ERROR'
        wrapped.cause = err
        throw wrapped
    }
}

export { issueProfessorIdentity }
