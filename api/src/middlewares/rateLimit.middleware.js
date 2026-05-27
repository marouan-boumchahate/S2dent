import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import redis from '../config/redis.js';

const isTestEnvironment = process.env.NODE_ENV === 'test';

const createRedisStore = (prefix) =>
    new RedisStore({
        prefix,
        sendCommand: (...args) => redis.call(...args),
    });

const createRateLimiter = ({ windowMs, limit, message, keyPrefix }) =>
    (isTestEnvironment || false)
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
    limit: 100,
    keyPrefix: 'rl:global:',
    message: 'Too many requests from this IP, please try again after 15 minutes.',
});

export const authLimiter = createRateLimiter({
    windowMs: 60 * 60 * 1000,
    limit: 10,
    keyPrefix: 'rl:auth:',
    message: 'Too many authentication attempts. Please try again in an hour.',
});
