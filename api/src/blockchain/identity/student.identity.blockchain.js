import { ethers } from 'ethers'
import { env } from '../../config/env.js'
import { platformWallet } from '../../config/blockchain.js'
import S2dentABI from '../contracts/S2dent.json' with { type: 'json' }

// constants
const blockchain = env.blockchain

const GAS_MARGIN_NUM = 120n; // +20%
const GAS_MARGIN_DEN = 100n;


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
const issueStudentIdentity = async (payload) => {
    try {
        const contract = getContract()

        const {
            studentAddress,
            academyAddress,
            publicKey,
            
            studentId,
            nationalId,
            fullName,
            nationality,

            enrollmentDate,
            department,
            country
        } = payload

        const args = {
            publicKey,
            studentId,
            nationalId,
            fullName,
            nationality,
            department,
            country,
            enrollmentDate: toUnixSeconds(enrollmentDate)
        }
        
        
        const params = [studentAddress, academyAddress, args]
        
        const gasLimit = await getGasLimit(contract, 'issueStudentIdentity', params)
        
        const tx = await contract.issueStudentIdentity(...params, { gasLimit })
        return tx

    } catch (err) {
        console.error('Blockchain error in issueStudentIdentity:', err)

        const reason = err?.reason ?? err?.shortMessage ?? err?.message ?? 'Unknown blockchain error'

        const wrapped = new Error(`issueStudentIdentity failed: ${reason}`)
        wrapped.statusCode = 502
        wrapped.code = 'BLOCKCHAIN_ERROR'
        wrapped.cause = err
        throw wrapped
    }
}
const revokeStudentIdentity = async (payload) => {
    try {
        const contract = getContract()

        const {
            studentAddress,
            academyAddress,
            reason
        } = payload

        const params = [studentAddress, academyAddress, reason]

        const gasLimit = await getGasLimit(contract, 'revokeStudentIdentity', params)

        const tx = await contract.revokeStudentIdentity(...params, { gasLimit })
        return tx

    } catch (err) {
        console.error('Blockchain error in revokeStudentIdentity:', err)

        const reason = err?.reason ?? err?.shortMessage ?? err?.message ?? 'Unknown blockchain error'

        const wrapped = new Error(`revokeStudentIdentity failed: ${reason.includes('revert') ? "Already revoked or does not exist" : reason}`)
        wrapped.statusCode = 502
        wrapped.code = 'BLOCKCHAIN_ERROR'
        wrapped.cause = err
        throw wrapped
    }
}
const getStudentIdentity = async (studentAddress) => {
    try {
        const contract = getContract()

        const [identity, status] = await contract.students(studentAddress)

        if (status.issuedAt === 0n) {
            return null
        }

        return {
            identity: {
                studentIdHash: identity.studentIdHash,
                nationalIdHash: identity.nationalIdHash,
                publicKey: identity.publicKey.toString(),
                fullName: identity.fullName,
                nationality: identity.nationality,
                academyName: identity.academyName,
                department: identity.department,
                country: identity.country,
                enrollmentDate: new Date(Number(identity.enrollmentDate) * 1000),
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

        const wrapped = new Error(`getStudentIdentity failed: ${reason}`)
        wrapped.statusCode = 502
        wrapped.code = 'BLOCKCHAIN_ERROR'
        wrapped.cause = err
        throw wrapped
    }
}

export { issueStudentIdentity, revokeStudentIdentity, getStudentIdentity }
