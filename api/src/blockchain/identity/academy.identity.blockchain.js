import { ethers } from 'ethers'
import { env } from '../../config/env.js'
import { platformWallet } from '../../config/blockchain.js'
import S2dentABI from '../contracts/S2dent.json' with { type: 'json' }

const blockchain = env.blockchain

const GAS_MARGIN_NUM = 120n; // +20%
const GAS_MARGIN_DEN = 100n;


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

const getGasLimit = async (contract, methodName, params) => {
    const gasEstimate = 
        await contract[methodName].estimateGas(...params)

    return (typeof gasEstimate === 'bigint')
        ? (gasEstimate * GAS_MARGIN_NUM) / GAS_MARGIN_DEN
        : gasEstimate.mul(GAS_MARGIN_NUM).div(GAS_MARGIN_DEN)
}

const ACADEMY_TYPE_TO_UINT8 = {
    university: 0,
    college: 1,
    school: 2,
    institute: 3,
    online_platform: 4,
    other: 5,
}


const issueAcademyIdentity = async (payload) => {
    try {
        const contract = getContract()

        const {
            walletAddress,

            academyNumber,
            name,
            shortName,
            academyType,

            legalName,
            registrationNumber,
            taxId,
            billingEmail,

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
                academyType: ACADEMY_TYPE_TO_UINT8[academyType.toLowerCase()] ?? ACADEMY_TYPE_TO_UINT8.other,
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

        const params = [walletAddress, args] // Conrtract Parameters

        const gasLimit = await getGasLimit(contract, 'issueAcademyIdentity', params)
        // console.log('Estimated gas limit (with margin):', gasLimit.toString())

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
