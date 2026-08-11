import { useState, useEffect, useCallback, useRef } from 'react';
import { useApi } from './useApi';

const CACHE_PREFIX = 'momo_cache_';
const STALE_TIME = 5 * 60 * 1000; // 5 minutes

export const useQuery = (key, url, options = {}) => {
  const { fetchWithRetry } = useApi();
  const [data, setData] = useState(() => {
    try {
      const cached = localStorage.getItem(`${CACHE_PREFIX}${key}`);
      if (cached) {
        const { value, timestamp } = JSON.parse(cached);
        // Instant data from cache
        return value;
      }
    } catch (e) { return null; }
    return null;
  });

  const [loading, setLoading] = useState(!data);
  const [error, setError] = useState(null);
  const inFlight = useRef(null);
  const cooldownRef = useRef(0);

  const optionsString = JSON.stringify(options);

  const fetchData = useCallback(async (isSilent = false) => {
    // 🛡️ Cooldown Protection
    if (Date.now() < cooldownRef.current) return;

    // Prevent redundant concurrent requests for the same key
    if (inFlight.current === key) return;
    inFlight.current = key;

    if (!isSilent) setLoading(true);
    
    try {
      const result = await fetchWithRetry(url, JSON.parse(optionsString));
      
      if (result.success) {
        const payload = result.data;
        
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
        const { timestamp } = JSON.parse(cached);
        const isStale = Date.now() - timestamp > STALE_TIME;
        // ⚡ Stale-While-Revalidate: serve cached data instantly, then refresh silently in bg if stale
        if (isStale) {
          fetchData(true);
        }
      } else {
        fetchData(); // cold start - must fetch
      }
    } catch (e) {
      fetchData(); // corrupt cache - force fresh fetch
    }
  }, [key, fetchData]);

  return { data, loading, error, refetch: fetchData, mutate };
};
