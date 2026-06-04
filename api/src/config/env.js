import dotenv from 'dotenv'

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

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 3000,
  email: {
    smtpHost: process.env.SMTP_HOST || 'smtp-relay.brevo.com',
    smtpPort: Number(process.env.SMTP_PORT || 587),
    smtpUser: process.env.SMTP_USER,
    smtpPass: process.env.SMTP_PASS,
    from: process.env.EMAIL_FROM,
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
  },
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
  },
}