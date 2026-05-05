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

const issueStudentIdentity = async (payload) => {
    try {
        const contract = getContract()

        const {
            studentWallet,
            academyWallet,
            
            studentId,
            nationalId,
            fullName,
            nationality,

            enrollmentDate,
            department,
            country
        } = payload

        const args = {
            studentId,
            nationalId,
            fullName,
            nationality,
            department,
            country,
            enrollmentDate: toUnixSeconds(enrollmentDate)
        }
        
        
        const params = [studentWallet, academyWallet, args]
        
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
            studentWallet,
            academyWallet
        } = payload

        const params = [studentWallet, academyWallet]

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

export { issueStudentIdentity, revokeStudentIdentity }
