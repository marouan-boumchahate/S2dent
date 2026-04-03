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

/**
 * @param {string} walletAddress
 * @param {string} academyAddress - Academy wallet (`academies.wallet_address`); stored as `issuer` on-chain.
 * @param {object} issueArgs - Nested struct matching `ProfessorIssueArgs` in `ProfessorIdentity.sol`
 *   (`ids`, `platform`, `person`, `addr`, `dept`, `job`).
 */
const issueProfessorIdentity = async (walletAddress, academyAddress, issueArgs) => {
    try {
        const contract = getContract()
        const tx = await contract.issueProfessorIdentity(
            walletAddress,
            academyAddress,
            issueArgs
        )
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
