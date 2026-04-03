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

const issueAcademyIdentity = async (payload) => {
    try {
        const contract = getContract()

        const {
            walletAddress,

            academyNumber,
            name,
            shortName,
            academyType,

            description,
            website,
            logoUrl,

            email,
            phone,

            legalName,
            registrationNumber,
            taxId,
            billingEmail,

            addressLine1,
            addressLine2,
            street,
            district,
            state,
            postalCode,
            city,
            country,
            latitude,
            longitude,

            fingerprint,
            certificatePem,
            chainPem,
            notBefore,
            notAfter

        } = payload

        const args = {
            infos: {
                academyId: academyNumber,
                name,
                shortName,
                academyType,
            },
            proofs: {
                legalName,
                registrationNumber,
                taxId,
                billingEmail,
            },
            cert: {
                fingerprint,
                certificate: certificatePem,
                chain: chainPem,
                notBefore: BigInt(toUnixSeconds(notBefore)),
                notAfter: BigInt(toUnixSeconds(notAfter)),
            },
        }

        // Prepare params as array for both estimateGas and actual call
        const params = [walletAddress, args]

        // Estimate gas (ethers v6: method-level estimateGas helper)
        const gasEstimate = await contract.issueAcademyIdentity.estimateGas(...params)
        // Add a margin for revert safety
        const gasLimit = (typeof gasEstimate === 'bigint')
            ? (gasEstimate * GAS_MARGIN_NUM) / GAS_MARGIN_DEN
            // Fallback for older return types (should be bigint in ethers v6)
            : gasEstimate.mul(GAS_MARGIN_NUM).div(GAS_MARGIN_DEN)

        // Call the function with explicit gasLimit
        const tx = await contract.issueAcademyIdentity(...params, { gasLimit })

        return tx

    } catch (err) {
        const reason = err?.reason ?? err?.shortMessage ?? err?.message ?? 'Unknown blockchain error'

        const wrapped = new Error(`issueAcademyIdentity failed: ${reason}`)
        wrapped.statusCode = 502
        wrapped.code = 'BLOCKCHAIN_ERROR'
        wrapped.cause = err
        throw wrapped
    }
}

export { issueAcademyIdentity }
