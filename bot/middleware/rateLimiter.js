const { redisClient, redisRest } = require('../config/redis');

// 🛡️ Atomic Lua Script for TCP Redis
const LUA_INCR_EXPIRE = `
  local current = redis.call('INCR', KEYS[1])
  if tonumber(current) == 1 then
    redis.call('EXPIRE', KEYS[1], ARGV[1])
  end
  return current
`;

// 🛡️ In-Memory Fallback Rate Limiter (0ms local fallback if Redis is unavailable)
const memoryStore = new Map();
const memoryTTL = new Map();

const memoryRateLimit = (key, windowSeconds) => {
  const now = Date.now();
  const expiry = memoryTTL.get(key);

  if (!expiry || now > expiry) {
    memoryStore.set(key, 1);
    memoryTTL.set(key, now + windowSeconds * 1000);
    return 1;
  }

  const count = (memoryStore.get(key) || 0) + 1;
  memoryStore.set(key, count);
  return count;
};

// Cleanup expired memory keys periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, expiry] of memoryTTL.entries()) {
    if (now > expiry) {
      memoryStore.delete(key);
      memoryTTL.delete(key);
    }
  }
}, 60000);

// 🛡️ Robust Client IP Resolution (Behind Trust Proxies)
const getClientIp = (req) => {
  if (req.ip) return req.ip;
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const ips = String(forwarded).split(',').map(s => s.trim());
    if (ips[0]) return ips[0];
  }
  return req.socket?.remoteAddress || '127.0.0.1';
};

/**
 * ⚡ Atomic Rate Limit Execution (Single-Step / Pipeline / Memory)
 */
const atomicIncrement = async (key, windowSeconds) => {
  // 1. Upstash REST (Atomic Pipeline - 1 HTTP Roundtrip, No Key Leaks)
  if (redisRest) {
    try {
      const p = redisRest.pipeline();
      p.incr(key);
      p.expire(key, windowSeconds);
      const res = await p.exec();
      const count = Array.isArray(res) ? res[0] : res;
      return typeof count === 'number' ? count : parseInt(count) || 1;
    } catch (e) {
      console.warn(`⚠️ Upstash REST Limiter Error: ${e.message}`);
    }
  }

  // 2. TCP Redis (Atomic Lua Script)
  if (redisClient && redisClient.isOpen) {
    try {
      const count = await redisClient.eval(LUA_INCR_EXPIRE, {
        keys: [key],
        arguments: [String(windowSeconds)]
      });
      return typeof count === 'number' ? count : parseInt(count) || 1;
    } catch (e) {
      console.warn(`⚠️ TCP Redis Limiter Error: ${e.message}`);
    }
  }

  // 3. In-Memory Fallback (Guaranteed 0ms execution)
  return memoryRateLimit(key, windowSeconds);
};

const globalLimiter = async (req, res, next) => {
  const ip = getClientIp(req);
  
  // 🛡️ Whitelist local development traffic
  const isDev = !process.env.NODE_ENV || process.env.NODE_ENV === 'development';
  if (isDev && (ip === '::1' || ip === '127.0.0.1' || ip.includes('localhost'))) {
    return next();
  }

  const key = `rate:global:${ip}`;
  const maxRequests = 300;
  const windowSeconds = 60;

  try {
    const count = await atomicIncrement(key, windowSeconds);
    if (count > maxRequests) {
      return res.status(429).json({ success: false, error: 'Too many requests. Please slow down.' });
    }
    next();
  } catch (err) {
    console.warn(`🚨 Rate Limit Fail-Open: ${err.message}`);
    next();
  }
};

const orderCreationLimiter = async (req, res, next) => {
  const ip = getClientIp(req);

  // 🛡️ Whitelist local development traffic
  const isDev = !process.env.NODE_ENV || process.env.NODE_ENV === 'development';
  if (isDev && (ip === '::1' || ip === '127.0.0.1' || ip.includes('localhost'))) {
    return next();
  }

  // 🛡️ Use Telegram User ID for unbreakable rate limiting
  const tgId = req.tgUser?.id || req.user?.user_id;
  const identifier = tgId || ip;
  const key = `rate:order:${identifier}`;
  const maxOrders = 15;
  const windowSeconds = 600; // 10 minutes

  try {
    const count = await atomicIncrement(key, windowSeconds);
    if (count > maxOrders) {
      return res.status(429).json({ success: false, error: 'Too many orders. Please wait 10 minutes.' });
    }
    next();
  } catch (err) {
    console.error('🔴 Order Rate Limit Error:', err.message);
    next();
  }
};

module.exports = { globalLimiter, orderCreationLimiter };
