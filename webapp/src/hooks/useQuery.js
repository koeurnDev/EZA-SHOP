import { useState, useEffect, useCallback, useRef } from 'react';
import { useApi } from './useApi';

const CACHE_PREFIX = 'momo_cache_';
const STALE_TIME = 5 * 60 * 1000; // 5 minutes

/** Old cache had products with image:null — skip hydrate only, never reject live API */
const isStaleImageCache = (value) => {
  const products = value?.products;
  if (!Array.isArray(products) || products.length === 0) return false;
  return products.every((p) => !p?.image);
};

export const useQuery = (key, url, options = {}) => {
  const { revalidateOnMount = false, ...fetchOptions } = options;
  const { fetchWithRetry } = useApi();
  const [data, setData] = useState(() => {
    try {
      const cached = localStorage.getItem(`${CACHE_PREFIX}${key}`);
      if (cached) {
        const { value } = JSON.parse(cached);
        if (isStaleImageCache(value)) return null;
        return value;
      }
    } catch (e) { return null; }
    return null;
  });

  const [loading, setLoading] = useState(!data);
  const [error, setError] = useState(null);
  const inFlight = useRef(null);
  const cooldownRef = useRef(0);
  const mutationEpochRef = useRef(0);

  const optionsString = JSON.stringify(fetchOptions);

  const fetchData = useCallback(async (isSilent = false) => {
    // 🛡️ Cooldown Protection
    if (Date.now() < cooldownRef.current) return;

    // Prevent redundant concurrent requests for the same key
    if (inFlight.current === key) return;
    inFlight.current = key;
    const epochAtStart = mutationEpochRef.current;

    if (!isSilent) setLoading(true);
    
    try {
      const result = await fetchWithRetry(url, JSON.parse(optionsString));
      
      if (result.success) {
        const payload = result.data;

        // Don't overwrite fresher optimistic/mutated data with a stale in-flight response
        if (epochAtStart !== mutationEpochRef.current) return;
        
        localStorage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify({
          value: payload,
          timestamp: Date.now()
        }));

        setData(payload);
        setError(null);
      } else {
        if (result.status === 429) {
          cooldownRef.current = Date.now() + 30000; // 30s cooldown
        }
        setError(result.error);
      }
    } finally {
      setLoading(false);
      inFlight.current = null;
    }
  }, [key, url, fetchWithRetry, optionsString]);

  const mutate = useCallback((updater) => {
    mutationEpochRef.current += 1;
    setData(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      try {
        if (next !== undefined && next !== null) {
          localStorage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify({
            value: next,
            timestamp: Date.now()
          }));
        } else {
          localStorage.removeItem(`${CACHE_PREFIX}${key}`);
        }
      } catch (e) {}
      return next;
    });
  }, [key]);

  useEffect(() => {
    try {
      const cached = localStorage.getItem(`${CACHE_PREFIX}${key}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (isStaleImageCache(parsed.value)) {
          localStorage.removeItem(`${CACHE_PREFIX}${key}`);
          fetchData();
          return;
        }
        const isStale = Date.now() - parsed.timestamp > STALE_TIME;
        if (revalidateOnMount || isStale) {
          fetchData(true);
        }
      } else {
        fetchData();
      }
    } catch (e) {
      fetchData();
    }
  }, [key, fetchData, revalidateOnMount]);

  return { data, loading, error, refetch: fetchData, mutate };
};
