const redis = require('redis');
const { Redis } = require('@upstash/redis');

/**
 * 🛡️ Hybrid Redis Configuration (v2 - Production Hardened):
 * 1. REST client (@upstash/redis) — stateless HTTP API rate limiting (Render/Vercel-friendly)
 * 2. TCP client (redis) — persistent socket connections for Bull job queues
 */

// --- 1. Upstash REST Client ---
let redisRest = null;
if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  redisRest = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
  console.log('🔌 Redis (REST): Ready');
}

// --- 2. TCP Redis Client ---
const REDIS_URL = process.env.REDIS_URL;
let redisClient = null;

if (REDIS_URL) {
  const isTls = REDIS_URL.startsWith('rediss://');
  redisClient = redis.createClient({
    url: REDIS_URL,
    socket: {
      tls: isTls,
      rejectUnauthorized: false,
      reconnectStrategy: (retries) => {
        if (retries >= 10) {
          console.error('🔴 Redis (TCP): Max reconnect attempts reached. Giving up.');
          return new Error('Redis max reconnect retries exceeded');
        }
        const delay = Math.min(retries * 200, 3000); // Exponential backoff: 200ms → 3s max
        console.warn(`🔁 Redis (TCP): Reconnecting in ${delay}ms (attempt ${retries + 1})...`);
        return delay;
      }
    }
  });

  redisClient.on('error', err => console.error('🔴 Redis (TCP) Error:', err.message));
  redisClient.on('ready', () => console.log('🔌 Redis (TCP): Ready'));
  redisClient.on('reconnecting', () => console.warn('🔁 Redis (TCP): Reconnecting...'));
  redisClient.on('end', () => console.warn('⚠️ Redis (TCP): Connection closed.'));
} else {
  console.warn('⚠️ Redis (TCP): Missing REDIS_URL. Queues will use memory fallback.');
}

/**
 * Non-blocking Redis TCP connect — called from server.js after DB is confirmed.
 */
const connectRedis = async () => {
  if (redisClient && !redisClient.isOpen) {
    redisClient.connect().catch(err => {
      console.error('🔴 Redis (TCP) Connection Failed:', err.message);
    });
  }
};

module.exports = { redisClient, redisRest, connectRedis };
