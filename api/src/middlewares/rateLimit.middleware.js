import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import redis from '../config/redis.js';
import {
    RATE_LIMIT_GLOBAL_MS,
    RATE_LIMIT_AUTH_MS,
    RATE_LIMIT_OTP_MS,
    RATE_LIMIT_CREDENTIAL_MS
} from '../config/ttl.js';

const isProductionEnvironment = process.env.NODE_ENV === 'production';

const createRedisStore = (prefix) =>
    new RedisStore({
        prefix,
        sendCommand: (...args) => redis.call(...args),
    });

const createRateLimiter = ({ windowMs, limit, message, keyPrefix }) =>
    (!isProductionEnvironment)
        ? (_req, _res, next) => next()
        : rateLimit({
            windowMs,
            limit,
            standardHeaders: true,
            legacyHeaders: false,
            store: createRedisStore(keyPrefix),
            message: { message },
            handler: (_req, res, _next, options) => {
                res.status(options.statusCode).json(options.message);
            },
            validate: {
                trustProxy: false,
            },
            passOnStoreError: true,
        });

export const globalLimiter = createRateLimiter({
    windowMs: RATE_LIMIT_GLOBAL_MS,
    limit: 1000,
    keyPrefix: 'rl:global:',
    message: 'Too many requests, please try again later.',
});

export const authLimiter = createRateLimiter({
    windowMs: RATE_LIMIT_AUTH_MS,
    limit: 15,
    keyPrefix: 'rl:auth:',
    message: 'Too many login attempts. Please try again after 15 minutes.',
});

export const otpLimiter = createRateLimiter({
    windowMs: RATE_LIMIT_OTP_MS,
    limit: 3,
    keyPrefix: 'rl:otp:',
    message: 'Too many OTP requests. Please wait a few minutes before trying again.',
});

export const credentialLimiter = createRateLimiter({
    windowMs: RATE_LIMIT_CREDENTIAL_MS,
    limit: 20,
    keyPrefix: 'rl:cred:',
    message: 'Too many credential operations. Please try again later.',
});
