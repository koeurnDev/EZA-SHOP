const { redisClient, redisRest } = require('../config/redis');

/**
 * 🚀 Cache Service (Production-Grade)
 * Strategy: Graceful degradation - continue without cache if Redis unavailable
 * Supports both REST (Upstash) and TCP (standard Redis) with fallback
 */

class CacheService {
  constructor() {
    this.fallbackCache = new Map();          // In-memory fallback
    this.maxFallbackSize = 100;              // Limit memory usage
    this.fallbackTTL = new Map();            // Track expiration
    this.initialized = false;
    this.timeoutLimit = 150; // ⚡ Max Speed: 150ms timeout for Cloud Redis
  }

  // Helper for performance-critical Cloud operations
  async _withTimeout(promise, operationName) {
    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`TIMEOUT (${operationName})`)), this.timeoutLimit)
    );
    return Promise.race([promise, timeout]);
  }

  // Check if Redis is available
  isRedisAvailable() {
    return !!(redisClient?.isOpen || redisRest);
  }

  // SET KEY WITH TTL (in seconds)
  async set(key, value, ttlSeconds = 300) {
    try {
      const serialized = JSON.stringify(value);

      // 1. Memory Fallback (Instant - storing raw object, not string, to save CPU)
      this._setFallback(key, value, ttlSeconds);

      // 2. TCP Redis (Fast - Non-blocking set)
      if (redisClient?.isOpen) {
        redisClient.setEx(key, ttlSeconds, serialized).catch(() => {});
      }

      // 3. Redis REST (Slow - Upstash)
      if (redisRest) {
        const restStart = Date.now();
        try {
          await this._withTimeout(redisRest.setex(key, ttlSeconds, serialized), 'SET_REST');
          return true;
        } catch (e) {
          // Silent fail for sets, we already have it in memory/local
        }
      }

      return true;
    } catch (err) {
      console.error(`⚠️ [CACHE] SET ERROR (${key}):`, err.message);
      return false;
    }
  }

  // GET KEY
  async get(key) {
    try {
      let data;

      // 🏎️ STRATEGY: LOCAL-FIRST (Memory -> TCP -> Cloud REST)
      
      // 1. Memory Fallback (0ms)
      data = this._getFallback(key);
      if (data) return data;

      // 2. TCP Redis (Local/Socket - ~1-10ms)
      if (redisClient?.isOpen) {
        try {
          data = await redisClient.get(key);
          if (data) return JSON.parse(data);
        } catch (e) {}
      }

      // 3. Redis REST (Cloud - ~200ms+ or timeout)
      if (redisRest) {
        const restStart = Date.now();
        try {
          const cloudData = await this._withTimeout(redisRest.get(key), 'GET_REST');
          const elapsed = Date.now() - restStart;
          
          if (cloudData) {
            if (elapsed > 100) console.log(`⏳ [CACHE] Cloud GET hits limit: ${elapsed}ms`);
            const parsed = typeof cloudData === 'object' ? cloudData : JSON.parse(cloudData);
            // Backfill local cache for next time
            this._setFallback(key, parsed, 300);
            return parsed;
          }
        } catch (e) {
          if (e.message.includes('TIMEOUT')) {
             // console.warn(`⚡ [CACHE] Cloud Timeout (150ms) - Bypassed for speed`);
          }
        }
      }

      return null;
    } catch (err) {
      return this._getFallback(key);
    }
  }

  // DELETE KEY
  async delete(key) {
    try {
      // Always clear in-memory cache
      this.fallbackCache.delete(key);
      this.fallbackTTL.delete(key);

      if (redisRest) {
        try {
          await this._withTimeout(redisRest.del(key), 'DELETE_REST');
          return true;
        } catch (e) {
          // Silent fail
        }
      }

      if (redisClient?.isOpen) {
        await redisClient.del(key);
        return true;
      }

      return true;
    } catch (err) {
      console.error(`⚠️ Cache DELETE Error (${key}):`, err.message);
      return false;
    }
  }

  // CLEAR PATTERN (e.g., "products:*")
  async clearPattern(pattern) {
    try {
      // Fallback: ALWAYS clear in-memory
      let cleared = 0;
      const patternRegex = new RegExp(pattern.replace('*', '.*'));
      for (const key of this.fallbackCache.keys()) {
        if (patternRegex.test(key)) {
          this.fallbackCache.delete(key);
          this.fallbackTTL.delete(key);
          cleared++;
        }
      }
      if (cleared > 0) console.log(`🗑️ Cache CLEAR PATTERN (Memory): ${pattern} (${cleared} keys)`);

      if (redisRest || redisClient?.isOpen) {
        // Pattern matching is limited, so we use del with pattern
        if (redisRest) {
          // Upstash REST doesn't have good pattern support, so best-effort
          console.log(`⚠️ Pattern clear limited for REST cache: ${pattern}`);
          return true;
        }

        if (redisClient?.isOpen) {
          const keys = await redisClient.keys(pattern);
          if (keys.length > 0) {
            await redisClient.del(keys);
            console.log(`🗑️ Cache CLEAR PATTERN (TCP): ${pattern} (${keys.length} keys)`);
          }
          return true;
        }
      }
      return true;
    } catch (err) {
      console.error(`⚠️ Cache CLEAR PATTERN Error (${pattern}):`, err.message);
      return false;
    }
  }

  // GET-OR-FETCH: If cache hit, return; else fetch & cache
  async getOrFetch(key, fetchFn, ttlSeconds = 300) {
    const start = Date.now();
    try {
      // Try cache first
      const cached = await this.get(key);
      if (cached) {
        const elapsed = Date.now() - start;
        if (elapsed > 100) console.log(`⏱️ [CACHE] HIT (SlowPath): ${elapsed}ms for ${key}`);
        return cached;
      }

      // Cache miss: fetch fresh data
      const fetchStart = Date.now();
      const fresh = await fetchFn();
      const dbElapsed = Date.now() - fetchStart;
      
      if (dbElapsed > 200) console.log(`⚠️ [DB] Query Slow: ${dbElapsed}ms for ${key}`);

      if (fresh) {
        // SET is async/non-blocking to user response for better UX
        this.set(key, fresh, ttlSeconds).catch(() => {});
      }
      return fresh;
    } catch (err) {
      console.error(`⚠️ [CACHE] Failure (${key}):`, err.message);
      return await fetchFn();
    }
  }

  // --- IN-MEMORY FALLBACK ---

  _setFallback(key, value, ttlSeconds) {
    if (this.fallbackCache.size >= this.maxFallbackSize) {
      const firstKey = this.fallbackCache.keys().next().value;
      this.fallbackCache.delete(firstKey);
      this.fallbackTTL.delete(firstKey);
    }

    this.fallbackCache.set(key, value);
    this.fallbackTTL.set(key, Date.now() + ttlSeconds * 1000);
  }

  _getFallback(key) {
    const expiry = this.fallbackTTL.get(key);
    if (!expiry || Date.now() > expiry) {
      this.fallbackCache.delete(key);
      this.fallbackTTL.delete(key);
      return null;
    }

    const data = this.fallbackCache.get(key);
    return data !== undefined ? data : null;
  }

  // STATS
  getStats() {
    return {
      redisAvailable: this.isRedisAvailable(),
      fallbackSize: this.fallbackCache.size,
      maxFallbackSize: this.maxFallbackSize
    };
  }
}

module.exports = new CacheService();
