import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import redis from '../config/redis.js';

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
    windowMs: 15 * 60 * 1000,
    limit: 1000,
    keyPrefix: 'rl:global:',
    message: 'Too many requests, please try again later.',
});

export const authLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000,
    limit: 15,
    keyPrefix: 'rl:auth:',
    message: 'Too many login attempts. Please try again after 15 minutes.',
});

export const otpLimiter = createRateLimiter({
    windowMs: 10 * 60 * 1000,
    limit: 3,
    keyPrefix: 'rl:otp:',
    message: 'Too many OTP requests. Please wait a few minutes before trying again.',
});

export const credentialLimiter = createRateLimiter({
    windowMs: 5 * 60 * 1000,
    limit: 20,
    keyPrefix: 'rl:cred:',
    message: 'Too many credential operations. Please try again later.',
});
