import Redis from 'ioredis';
import { env } from './env.js';

const redis = new Redis({
    host: env.redis.host,
    port: env.redis.port,
    password: env.redis.password ?? undefined,
});

redis.on('error', (err) => console.error('[Redis]', err));

export default redis;