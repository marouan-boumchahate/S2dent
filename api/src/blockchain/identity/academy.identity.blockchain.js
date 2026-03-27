import { ethers } from 'ethers'
import { env } from '../../config/env.js'
import { platformWallet } from '../../config/blockchain.js'
import S2dentABI from '../contracts/S2dent.json' with { type: 'json' }

const blockchain = env.blockchain;

const getContract = () =>
    new ethers.Contract(
        blockchain.deployedContractAddress,
        S2dentABI.abi,
        platformWallet
    )


const issueAcademyIdentity = async (
    wallet_address,
    academy_id,
    name,
    short_name,
    country,
    fingerprint,
    not_before,
    not_after
) => {
    try {
        const contract = getContract()

        const tx = await contract.issueAcademyIdentity(
            wallet_address,
            academy_id,
            name,
            short_name,
            country,
            fingerprint,
            Math.floor(not_before.getTime() / 1000),
            Math.floor(not_after.getTime() / 1000)
        )

        return tx;

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