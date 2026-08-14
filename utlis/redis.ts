import { Redis } from "ioredis";
require('dotenv').config();

const redisClient = () => {
    if (process.env.REDIS_URL) {
        try {
            const parts = process.env.REDIS_URL.split('@');
            const hostPart = parts.length > 1 ? parts[1] : parts[0];
            const host = hostPart.split(':')[0].replace(/^(redis|rediss|https?):\/\//, '');
            console.log(`Redis: Attempting connection to ${host}...`);
        } catch {
            console.log(`Redis: Attempting connection...`);
        }
        return process.env.REDIS_URL;
    }
    console.warn('⚠️ Warning: REDIS_URL not found in environment. Redis features will be disabled.');
    return "";
};

const redisUrl = redisClient();

// Initialize Redis with fail-safe options
export const redis = redisUrl 
    ? new Redis(redisUrl, {
        maxRetriesPerRequest: null, // Don't crash the app if Redis is down
        // Prevent auth middleware from hanging forever on redis.get (falls back to DB)
        commandTimeout: 8000,
        connectTimeout: 10000,
        retryStrategy(times) {
            const delay = Math.min(times * 50, 2000);
            return delay;
        }
    })
    : {
        // Mock object if Redis is disabled
        get: async () => null,
        set: async () => null,
        del: async () => null,
        on: () => {},
    } as any;

if (redisUrl) {
    redis.on('error', (err: any) => {
        console.error('❌ Redis Connection Error:', err.message);
    });

    redis.on('connect', () => {
        console.log('✅ Successfully connected to Redis');
    });
}