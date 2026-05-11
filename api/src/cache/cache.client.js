import redis from '../config/redis.js';

const getCache = async (key) => {
    const data = await redis.get(key);
    return data ? JSON.parse(data) : null;
}
const setCache = async (key, data, ttlSeconds) => {
    await redis.set(key, JSON.stringify(data), 'EX', ttlSeconds);
}
const delCache = async (key) => {
    await redis.del(key);
}

export { getCache, setCache, delCache };