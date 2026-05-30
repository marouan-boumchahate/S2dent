import { ethers } from 'ethers'
import { env } from '../config/env.js'
import { provider } from '../config/blockchain.js'
import S2dentABI from './contracts/S2dent.json' with { type: 'json' }

const blockchain = env.blockchain

const getContract = () =>
	new ethers.Contract(
		blockchain.deployedContractAddress,
		S2dentABI.abi,
		provider
	)

const isOwnerService = async (message, signature) => {
	try {
		const contract = getContract()
		return await contract.isMessageSignedByOwner(message, signature)
	} catch { return false }
}

export { isOwnerService }
