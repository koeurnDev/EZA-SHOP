const { redisClient, redisRest } = require('../config/redis');

/**
 * 🚀 Cache Service (Production-Grade V2)
 * Features:
 * 1. Safe Upstash REST & TCP Redis Invalidation (clearPattern & delete).
 * 2. Zero Unhandled Promise Rejections (wrapped async tasks).
 * 3. ReDoS-safe Regex Pattern Invalidation.
 * 4. Mutation-Leak Proof In-Memory Cache (structuredClone / deep copy).
 */
class CacheService {
  constructor() {
    this.fallbackCache = new Map();          // In-memory fallback
    this.maxFallbackSize = 100;              // Limit memory usage
    this.fallbackTTL = new Map();            // Track expiration
    this.initialized = false;
    this.timeoutLimit = 150; // ⚡ Max Speed: 150ms timeout for Cloud Redis
  }

  // Deep clone helper to prevent object mutation leaks in memory
  _clone(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    try {
      return typeof structuredClone === 'function' ? structuredClone(obj) : JSON.parse(JSON.stringify(obj));
    } catch (e) {
      return obj;
    }
  }

  // Helper for performance-critical Cloud operations with strict rejection safety and timer cleanup
  async _withTimeout(promise, operationName) {
    let timer;
    const timeout = new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(`TIMEOUT (${operationName})`)), this.timeoutLimit);
    });

    try {
      const res = await Promise.race([promise, timeout]);
      return res;
    } finally {
      clearTimeout(timer);
    }
  }

  // Check if Redis is available
  isRedisAvailable() {
    return !!(redisClient?.isOpen || redisRest);
  }

  // SET KEY WITH TTL (in seconds)
  async set(key, value, ttlSeconds = 300) {
    try {
      const serialized = JSON.stringify(value);

      // 1. Memory Fallback (Cloned to prevent mutation leaks)
      this._setFallback(key, value, ttlSeconds);

      // 2. TCP Redis (Fast - Non-blocking set)
      if (redisClient?.isOpen) {
        redisClient.setEx(key, ttlSeconds, serialized).catch(() => {});
      }

      // 3. Redis REST (Slow - Upstash with safe rejection wrapper)
      if (redisRest) {
        this._withTimeout(
          Promise.resolve().then(() => redisRest.setex(key, ttlSeconds, serialized)),
          'SET_REST'
        ).catch(() => {});
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
          const cloudData = await this._withTimeout(
            Promise.resolve().then(() => redisRest.get(key)),
            'GET_REST'
          );
          const elapsed = Date.now() - restStart;
          
          if (cloudData) {
            if (elapsed > 100) console.log(`⏳ [CACHE] Cloud GET hits limit: ${elapsed}ms`);
            const parsed = typeof cloudData === 'object' ? cloudData : JSON.parse(cloudData);
            // Backfill local cache for next time
            this._setFallback(key, parsed, 300);
            return this._clone(parsed);
          }
        } catch (e) {
          // Timeout or network bypass
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

      const tasks = [];

      if (redisRest) {
        tasks.push((async () => {
          try {
            await this._withTimeout(
              Promise.resolve().then(() => redisRest.del(key)),
              'DELETE_REST'
            );
          } catch (e) {}
        })());
      }

      if (redisClient?.isOpen) {
        tasks.push(redisClient.del(key).catch(() => {}));
      }

      await Promise.all(tasks);
      return true;
    } catch (err) {
      console.error(`⚠️ Cache DELETE Error (${key}):`, err.message);
      return false;
    }
  }

  // CLEAR PATTERN (e.g., "products:*")
  async clearPattern(pattern) {
    try {
      // 1. ReDoS-safe Regex escaping for in-memory fallback matching
      let cleared = 0;
      const escapedPattern = '^' + pattern.split('*').map(s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('.*') + '$';
      const patternRegex = new RegExp(escapedPattern);

      for (const key of this.fallbackCache.keys()) {
        if (patternRegex.test(key)) {
          this.fallbackCache.delete(key);
          this.fallbackTTL.delete(key);
          cleared++;
        }
      }
      if (cleared > 0) console.log(`🗑️ Cache CLEAR PATTERN (Memory): ${pattern} (${cleared} keys)`);

      const tasks = [];

      // 2. Upstash REST Pattern Clearing
      if (redisRest) {
        tasks.push((async () => {
          try {
            const keys = await this._withTimeout(
              Promise.resolve().then(() => redisRest.keys(pattern)),
              'KEYS_REST'
            );
            if (Array.isArray(keys) && keys.length > 0) {
              await this._withTimeout(
                Promise.resolve().then(() => redisRest.del(...keys)),
                'DEL_REST'
              );
              console.log(`🗑️ Cache CLEAR PATTERN (REST): ${pattern} (${keys.length} keys)`);
            }
          } catch (e) {}
        })());
      }

      // 3. TCP Redis Pattern Clearing
      if (redisClient?.isOpen) {
        tasks.push((async () => {
          try {
            const keys = await redisClient.keys(pattern);
            if (Array.isArray(keys) && keys.length > 0) {
              await redisClient.del(keys);
              console.log(`🗑️ Cache CLEAR PATTERN (TCP): ${pattern} (${keys.length} keys)`);
            }
          } catch (e) {}
        })());
      }

      await Promise.all(tasks);
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

  // --- IN-MEMORY FALLBACK (True LRU Eviction) ---

  _setFallback(key, value, ttlSeconds) {
    if (this.fallbackCache.has(key)) {
      this.fallbackCache.delete(key);
    } else if (this.fallbackCache.size >= this.maxFallbackSize) {
      // Evict Least Recently Used (LRU) item at head of Map
      const lruKey = this.fallbackCache.keys().next().value;
      if (lruKey !== undefined) {
        this.fallbackCache.delete(lruKey);
        this.fallbackTTL.delete(lruKey);
      }
    }

    this.fallbackCache.set(key, this._clone(value));
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
    if (data !== undefined) {
      // ⚡ LRU Strategy: Refresh key to most-recently-used position at tail of Map
      this.fallbackCache.delete(key);
      this.fallbackCache.set(key, data);
      return this._clone(data);
    }
    return null;
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
