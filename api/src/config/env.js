import dotenv from 'dotenv'
import { ChainstackProvider } from 'ethers'

dotenv.config({
  path: process.env.NODE_ENV === 'test' ? '.env.test' : '.env',
  override: false
})

const parseRedisUrl = (redisUrl) => {
  if (!redisUrl) return {}

  if (!redisUrl.startsWith('redis://') && !redisUrl.startsWith('rediss://')) {
    throw new Error('Redis URL must start with "redis://" or "rediss://"')
  }

  try {
    const url = new URL(redisUrl)

    if (!url.hostname) {
      throw new Error('Redis URL is missing a hostname')
    }

    return {
      host: url.hostname,
      port: url.port ? Number(url.port) : undefined,
      password: url.password || undefined,
    }
  } catch (err) {
    throw new Error(`Failed to parse Redis URL: ${err.message}`)
  }
}

let redisFromUrl = {}
try {
  redisFromUrl = parseRedisUrl(process.env.REDIS_URL)
} catch {
  // Ignored here; validateSecrets() will capture validation errors and exit the process.
}

const validateSecrets = () => {
  const errors = []

  const accessSecret = process.env.JWT_ACCESS_SECRET
  const refreshSecret = process.env.JWT_REFRESH_SECRET
  const encryptionSecret = process.env.JWT_ENCRYPTION_SECRET

  if (!accessSecret) errors.push('JWT_ACCESS_SECRET is missing.')
  else if (accessSecret.length < 32) errors.push('JWT_ACCESS_SECRET is too weak. It should be at least 32 characters long.')

  if (!refreshSecret) errors.push('JWT_REFRESH_SECRET is missing.')
  else if (refreshSecret.length < 32) errors.push('JWT_REFRESH_SECRET is too weak. It should be at least 32 characters long.')

  if (!encryptionSecret) errors.push('JWT_ENCRYPTION_SECRET is missing.')
  else {
    const decodedKey = Buffer.from(encryptionSecret, 'hex')
    if (decodedKey.length !== 32) errors.push('JWT_ENCRYPTION_SECRET must be a valid 64-character hex string that decodes to exactly 32 bytes (256 bits) for AES-256-GCM.')
  }

  const redisUrl = process.env.REDIS_URL
  if (redisUrl) {
    try {
      parseRedisUrl(redisUrl)
    } catch (err) {
      errors.push(`REDIS_URL is invalid: ${err.message}`)
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
    encryptionSecret: process.env.JWT_ENCRYPTION_SECRET 
      ? Buffer.from(process.env.JWT_ENCRYPTION_SECRET, 'hex') 
      : Buffer.alloc(0),
  },
}
