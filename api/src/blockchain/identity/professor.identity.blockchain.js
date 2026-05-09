import { ethers } from 'ethers'
import { env } from '../../config/env.js'
import { platformWallet } from '../../config/blockchain.js'
import S2dentABI from '../contracts/S2dent.json' with { type: 'json' }

// constants
const blockchain = env.blockchain

const GAS_MARGIN_NUM = 120n; // +20%
const GAS_MARGIN_DEN = 100n;

const EMPLOYMENT_TYPE_TO_UINT8 = {
    full_time: 0,
    part_time: 1,
    adjunct: 2,
    visiting: 3,
    contract: 4,
    other: 5,
}

const PROFESSOR_RANK_TO_UINT8 = {
    'assist. prof': 0,
    'assoc. prof': 1,
    prof: 2,
    lecturer: 3,
    instructor: 4,
    other: 5,
}


// Helpers
const getContract = () =>
    new ethers.Contract(
        blockchain.deployedContractAddress,
        S2dentABI.abi,
        platformWallet
    )
const getGasLimit = async (contract, methodName, params) => {
    const gasEstimate = 
        await contract[methodName].estimateGas(...params)

    return (typeof gasEstimate === 'bigint')
        ? (gasEstimate * GAS_MARGIN_NUM) / GAS_MARGIN_DEN
        : gasEstimate.mul(GAS_MARGIN_NUM).div(GAS_MARGIN_DEN)
}
const toUnixSeconds = (value) => {
    if (value instanceof Date) 
        return Math.floor(value.getTime() / 1000)

    return Math.floor(new Date(value).getTime() / 1000)
}


// Services
const issueProfessorIdentity = async (payload) => {
    try {
        const contract = getContract()

        const {
            professorWallet,
            academyWallet,
            
            employeeId,
            nationalId,
            fullName,
            
            hireDate,
            rank,
            employmentType
        } = payload

        const args = {
            employeeId,
            nationalId,
            fullName,
            hireDate: toUnixSeconds(hireDate),
            rank: PROFESSOR_RANK_TO_UINT8[rank.toLowerCase()] ?? PROFESSOR_RANK_TO_UINT8.other,
            employmentType: EMPLOYMENT_TYPE_TO_UINT8[employmentType.toLowerCase()] ?? EMPLOYMENT_TYPE_TO_UINT8.other
        }

        const params = [professorWallet, academyWallet, args]

        const gasLimit = await getGasLimit(contract, 'issueProfessorIdentity', params)

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
const revokeProfessorIdentity = async (payload) => {
    try {
        const contract = getContract()

        const {
            professorWallet,
            academyWallet
        } = payload

        const params = [professorWallet, academyWallet]

        const gasLimit = await getGasLimit(contract, 'revokeProfessorIdentity', params)

        const tx = await contract.revokeProfessorIdentity(...params, { gasLimit })
        return tx

    } catch (err) {
        const reason = err?.reason ?? err?.shortMessage ?? err?.message ?? 'Unknown blockchain error'

        const wrapped = new Error(`revokeProfessorIdentity failed: ${reason.includes('revert') ? "Already revoked or does not exist" : reason}`)
        wrapped.statusCode = 502
        wrapped.code = 'BLOCKCHAIN_ERROR'
        wrapped.cause = err
        throw wrapped
    }
}
const getProfessorIdentity = async (walletAddress) => {
    try {
        const contract = getContract()

        const [identity, status] = await contract.professors(walletAddress)

        if (status.issuedAt === 0n) {
            return null
        }

        return {
            identity: {
                employeeIdHash: identity.employeeIdHash,
                nationalIdHash: identity.nationalIdHash,
                fullName: identity.fullName,
                rank: Number(identity.rank),
                employmentType: Number(identity.employmentType),
                hireDate: new Date(Number(identity.hireDate) * 1000),
            },
            status: {
                issuedAt: new Date(Number(status.issuedAt) * 1000),
                issuer: status.issuer.toString(),
                isRevoked: !status.isNotRevoked,
                revokedAt: status.revokedAt === 0n ? null : new Date(Number(status.revokedAt) * 1000),
                revoker: status.revokedAt === 0n ? null : status.revoker.toString(),
            },
        }
    } catch (err) {
        const reason = err?.reason ?? err?.shortMessage ?? err?.message ?? 'Unknown blockchain error'

        const wrapped = new Error(`getProfessorIdentity failed: ${reason}`)
        wrapped.statusCode = 502
        wrapped.code = 'BLOCKCHAIN_ERROR'
        wrapped.cause = err
        throw wrapped
    }
}

export { issueProfessorIdentity, revokeProfessorIdentity, getProfessorIdentity }
