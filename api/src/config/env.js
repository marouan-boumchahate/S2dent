import dotenv from 'dotenv'
import { ChainstackProvider } from 'ethers'

dotenv.config({
  path: process.env.NODE_ENV === 'test' ? '.env.test' : '.env',
  override: false
})

const parseRedisUrl = (redisUrl) => {
  if (!redisUrl) return {}

  try {
    const url = new URL(redisUrl)

    return {
      host: url.hostname,
      port: url.port ? Number(url.port) : undefined,
      password: url.password || undefined,
    }
  } catch {
    return {}
  }
}

const redisFromUrl = parseRedisUrl(process.env.REDIS_URL)

const validateSecrets = () => {
  const errors = []

  const accessSecret = process.env.JWT_ACCESS_SECRET
  const refreshSecret = process.env.JWT_REFRESH_SECRET
  const encryptionSecret = process.env.JWT_ENCRYPTION_SECRET

  if (!accessSecret) {
    errors.push('JWT_ACCESS_SECRET is missing.')
  } else if (accessSecret.length < 32) {
    errors.push('JWT_ACCESS_SECRET is too weak. It should be at least 32 characters long.')
  }

  if (!refreshSecret) {
    errors.push('JWT_REFRESH_SECRET is missing.')
  } else if (refreshSecret.length < 32) {
    errors.push('JWT_REFRESH_SECRET is too weak. It should be at least 32 characters long.')
  }

  if (!encryptionSecret) {
    errors.push('JWT_ENCRYPTION_SECRET is missing.')
  } else {
    const hexRegex = /^[0-9a-fA-F]{64}$/
    if (!hexRegex.test(encryptionSecret)) {
      errors.push('JWT_ENCRYPTION_SECRET must be a valid 64-character hex string (representing a 256-bit key for AES-256-GCM).')
    }
  }

  if (errors.length > 0) {
    console.error('❌ Startup configuration validation failed:')
    errors.forEach((err) => console.error(`  - ${err}`))
    process.exit(1)
  }
}

validateSecrets()

export const env = {
  ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : [],
  PRODUCTION: process.env.NODE_ENV === 'production',
  NODE_ENV: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 3000,
  email: {
    smtpHost: process.env.SMTP_HOST || 'smtp-relay.brevo.com',
    smtpPort: Number(process.env.SMTP_PORT || 587),
    smtpUser: process.env.SMTP_USER,
    smtpPass: process.env.SMTP_PASS,
    from: process.env.EMAIL_FROM,
    brevoApiKey: process.env.BREVO_API_KEY,
  },
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 5432),
    name: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: process.env.DB_SSL === 'true',
  },
  redis: {
    url: process.env.REDIS_URL,
    host: redisFromUrl.host || process.env.REDIS_HOST,
    port: redisFromUrl.port || process.env.REDIS_PORT,
    password: redisFromUrl.password || process.env.REDIS_PASSWORD,
  },
  blockchain: {
    rpcUrl: process.env.BLOCKCHAIN_RPC_URL,
    platformPrivateKey: process.env.BLOCKCHAIN_PLATFORM_PRIVATE_KEY,
    deployedContractAddress: process.env.BLOCKCHAIN_DEPLOYED_CONTRACT_ADDRESS,
    chainId: Number(process.env.BLOCKCHAIN_CHAIN_ID || 1),
  },
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
  },
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    encryptionSecret: Buffer.from(process.env.JWT_ENCRYPTION_SECRET, 'hex'),
  },
}
