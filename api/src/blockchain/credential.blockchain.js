import { ethers } from 'ethers'
import { env } from '../config/env.js'
import { platformWallet } from '../config/blockchain.js'
import S2dentABI from './contracts/S2dent.json' with { type: 'json' }

// constants
const blockchain = env.blockchain

const GAS_MARGIN_NUM = 120n; // +20%
const GAS_MARGIN_DEN = 100n;

const CREDENTIAL_TYPE_TO_UINT8 = {
    attendance: 0,
    enrollment: 1,
    degree: 2,
    achievement: 3,
    certificate: 4,
    transcript: 5,
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
const normalizeCredentialType = (value) => {
    if (typeof value === 'number') {
        return value
    }

    const normalized = CREDENTIAL_TYPE_TO_UINT8[String(value).toLowerCase()]

    if (normalized === undefined) {
        throw new Error(`Unsupported credential type: ${value}`)
    }

    return normalized
}
const toCredentialData = (record) => ({
    identity: {
        title: record.identity.title,
        code: record.identity.code,
        credentialType: Number(record.identity.credentialType),
        description: record.identity.description,
        academyName: record.identity.academyName,
    },
    payload: {
        payloadHash: record.payload.payloadHash,
        payloadSignature: record.payload.payloadSignature,
        encryptedPayload: record.payload.encryptedPayload,
    },
    status: {
        issuedAt: new Date(Number(record.status.issuedAt) * 1000),
        revokedAt: record.status.revokedAt === 0n ? null : new Date(Number(record.status.revokedAt) * 1000),
        academy: record.status.academy.toString(),
        issuer: record.status.issuer.toString(),
        revoker: record.status.revokedAt === 0n ? null : record.status.revoker.toString(),
        isRevoked: !record.status.isNotRevoked,
        revocationReason: record.status.revocationReason,
    },
})


// Services
const issueCredential = async (payload) => {
    try {
        const contract = getContract()

        const {
            studentAddress,
            issuerAddress,
            academyAddress,

            title,
            code,
            credentialType,
            description,

            payloadHash,
            payloadSignature,
            encryptedPayload,
        } = payload

        const args = {
            infos: {
                title: title,
                code: code,
                credentialType: normalizeCredentialType(credentialType),
                description: description,
            },
            payload: {
                payloadHash: payloadHash,
                payloadSignature: payloadSignature,
                encryptedPayload: encryptedPayload,
            },
        }

        const params = [studentAddress, issuerAddress, academyAddress, args]

        const gasLimit = await getGasLimit(contract, 'issueCredential', params)

        const tx = await contract.issueCredential(...params, { gasLimit })
        return tx

    } catch (err) {
        const reason = err?.reason ?? err?.shortMessage ?? err?.message ?? 'Unknown blockchain error'

        const wrapped = new Error(`issueCredential failed: ${reason}`)
        wrapped.statusCode = 502
        wrapped.code = 'BLOCKCHAIN_ERROR'
        wrapped.cause = err
        throw wrapped
    }
}
const revokeCredential = async (payload) => {
    try {
        const contract = getContract()

        const {
            studentAddress,
            index,
            revokerAddress,
            reason,
        } = payload

        const params = [studentAddress, index, revokerAddress, reason]

        const gasLimit = await getGasLimit(contract, 'revokeCredential', params)

        const tx = await contract.revokeCredential(...params, { gasLimit })
        return tx

    } catch (err) {
        const reason = err?.reason ?? err?.shortMessage ?? err?.message ?? 'Unknown blockchain error'

        const wrapped = new Error(`revokeCredential failed: ${reason.includes('revert') ? 'Already revoked or does not exist' : reason}`)
        wrapped.statusCode = 502
        wrapped.code = 'BLOCKCHAIN_ERROR'
        wrapped.cause = err
        throw wrapped
    }
}
const getCredential = async (studentAddress, index) => {
    try {
        const contract = getContract()

        const count = await contract.getCredentialCount(studentAddress)
        const credentialIndex = typeof index === 'bigint' ? index : BigInt(index)

        if (credentialIndex >= count) {
            return null
        }

        const record = await contract.getCredential(studentAddress, credentialIndex)

        return toCredentialData(record)

    } catch (err) {
        const reason = err?.reason ?? err?.shortMessage ?? err?.message ?? 'Unknown blockchain error'

        const wrapped = new Error(`getCredential failed: ${reason}`)
        wrapped.statusCode = 502
        wrapped.code = 'BLOCKCHAIN_ERROR'
        wrapped.cause = err
        throw wrapped
    }
}
// const getCredentialsForStudent = async (studentAddress) => {
//     try {
//         const contract = getContract()

//         const count = await contract.getCredentialCount(studentAddress)
//         const credentials = []

//         for (let index = 0n; index < count; index += 1n) {
//             const record = await contract.getCredential(studentAddress, index)
//             credentials.push({
//                 index: Number(index),
//                 ...toCredentialData(record),
//             })
//         }

//         return credentials

//     } catch (err) {
//         const reason = err?.reason ?? err?.shortMessage ?? err?.message ?? 'Unknown blockchain error'

//         const wrapped = new Error(`getCredentialsForStudent failed: ${reason}`)
//         wrapped.statusCode = 502
//         wrapped.code = 'BLOCKCHAIN_ERROR'
//         wrapped.cause = err
//         throw wrapped
//     }
// }

export { issueCredential, revokeCredential, getCredential }
