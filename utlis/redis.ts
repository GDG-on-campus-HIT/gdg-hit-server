import { Redis } from "ioredis";
require('dotenv').config();

const redisClient = () => {
    if(process.env.REDIS_URL){
        console.log(`Redis client initialized with URL: ${process.env.REDIS_URL.split('@')[1]}`);
        return process.env.REDIS_URL;
    }
    throw new Error('Redis connection failed: REDIS_URL not found in environment');
};

export const redis = new Redis(redisClient());

redis.on('error', (err) => {
    console.error('[ioredis] Error connecting to Redis:', err.message);
});

redis.on('connect', () => {
    console.log('Successfully connected to Redis');
});