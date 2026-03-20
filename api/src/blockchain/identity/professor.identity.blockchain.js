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


const issueProfessorIdentity = async (
    wallet_address,
    employee_id,
    full_name,
    title,
    department,
    faculty,
    academy_wallet_address
) => {
    try {
        const contract = getContract()

        const tx = await contract.issueProfessorIdentity(
            wallet_address,
            employee_id,
            full_name,
            title,
            department,
            faculty,
            academy_wallet_address
        )

        const receipt = await tx.wait(1)

        return receipt.hash
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