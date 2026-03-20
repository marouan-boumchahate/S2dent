import { ethers } from 'ethers'
import { env } from './env.js'

const blockchain = env.blockchain;

const provider = new ethers.JsonRpcProvider(blockchain.rpcUrl)

const platformWallet = new ethers.Wallet(
  blockchain.platformPrivateKey,
  provider
)

export { provider, platformWallet }