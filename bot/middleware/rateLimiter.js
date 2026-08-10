const { redisRest } = require('../config/redis');

const globalLimiter = async (req, res, next) => {
  // 🛡️ Use REST client for rate limiting
  if (!redisRest) return next();
  
  const ip = req.ip || req.socket.remoteAddress;
  
  // 🛡️ Whitelist local development traffic
  const isDev = !process.env.NODE_ENV || process.env.NODE_ENV === 'development';
  if (isDev && (ip === '::1' || ip === '127.0.0.1' || ip.includes('localhost'))) {
    return next();
  }

  const key = `rate:global:${ip}`;
  
  try {
    const count = await redisRest.incr(key);
    
    // 🛡️ Fire-and-forget expiration to save ~100ms latency per request!
    if (count === 1) {
      redisRest.expire(key, 60).catch(() => {});
    } else if (count % 100 === 0) {
      // Occasional safety check, done asynchronously
      redisRest.ttl(key).then(ttl => {
        if (ttl < 0) redisRest.expire(key, 60).catch(() => {});
      }).catch(() => {});
    }
    
    if (count > 300) {
      return res.status(429).json({ success: false, error: 'Too many requests. Please slow down.' });
    }
    next();
  } catch (err) {
    // 🛡 Fail-Open: Allow request if Redis is down, but keep it logged
    console.warn(`🚨 Rate Limit Offline (REST): ${err.message}`);
    next();
  }
};

const orderCreationLimiter = async (req, res, next) => {
  if (!redisRest) return next();
  
  const ip = req.ip || req.socket.remoteAddress;

  // 🛡️ Whitelist local development traffic
  const isDev = !process.env.NODE_ENV || process.env.NODE_ENV === 'development';
  if (isDev && (ip === '::1' || ip === '127.0.0.1' || ip.includes('localhost'))) {
    return next();
  }
  // 🛡️ Use Telegram User ID for unbreakable rate limiting (instead of easily bypassed IP)
  const tgId = req.tgUser?.id || req.user?.user_id;
  
  if (!tgId) {
    // If somehow authentication failed but verifyUser passed (impossible), fallback to IP
    console.warn('⚠️ Order Rate Limiter: tgId missing, falling back to IP');
  }
  
  const identifier = tgId || ip;
  const key = `rate:order:${identifier}`;
  
  try {
    const count = await redisRest.incr(key);
    if (count === 1) redisRest.expire(key, 600).catch(() => {}); // 10 minutes, fire-and-forget
    
    // 🛡️ Limit to 15 orders per user per 10 minutes
    if (count > 15) {
      return res.status(429).json({ success: false, error: 'Too many orders. Please wait 10 minutes.' });
    }
    next();
  } catch (err) {
    console.error('🔴 Order Rate Limit Fail (REST):', err);
    next();
  }
};

module.exports = { globalLimiter, orderCreationLimiter };
