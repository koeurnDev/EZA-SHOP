/**
 * 🛠️ Senior Performance Engineering: Request Deduplication & Lifecycle Caching
 * Prevents "double-fetching" during rapid navigation or StrictMode renders.
 */
class ApiCache {
  constructor(defaultTtl = 60000, maxSize = 200) { // 1 minute default, 200 items max
    this.cache = new Map();
    this.pending = new Map();
    this.defaultTtl = defaultTtl;
    this.maxSize = maxSize;
  }

  async fetch(key, fetcher, ttl = this.defaultTtl) {
    const now = Date.now();
    const cached = this.cache.get(key);

    // 1. Hit: Return if valid (and update LRU position)
    if (cached && (now - cached.timestamp < ttl)) {
       this.cache.delete(key);
       this.cache.set(key, cached); // Move to end (most recently used)
       return cached.data;
    }

    // 2. Coalesce: Return existing promise if in-flight
    if (this.pending.has(key)) {
       return this.pending.get(key);
    }

    // 3. Miss: Execute fetch
    const promise = fetcher()
      .then(data => {
        // Enforce LRU size limit
        if (this.cache.size >= this.maxSize) {
          const oldestKey = this.cache.keys().next().value;
          this.cache.delete(oldestKey);
        }
        this.cache.set(key, { data, timestamp: Date.now() });
        return data;
      })
      .finally(() => {
        this.pending.delete(key);
      });

    this.pending.set(key, promise);
    return promise;
  }

  invalidate(key) {
    if (key) this.cache.delete(key);
    else this.cache.clear();
  }
}

export default new ApiCache();
