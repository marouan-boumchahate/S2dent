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
    walletAddress, 
    academyId, 
    name, 
    short_name
) => {
    try {
        const contract = getContract()

        const tx = await contract.issueAcademyIdentity(
            walletAddress,
            academyId,
            name,
            short_name
        )

        const receipt = await tx.wait(1)

        return receipt.hash
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