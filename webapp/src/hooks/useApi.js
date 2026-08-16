import { useCallback, useState, useMemo } from 'react';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || '';

const DEFAULT_CONFIG = {
  retries: 3,
  retryDelay: 1000,
  exponential: true,
};

export const useApi = (customConfig = {}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const config = useMemo(() => ({
    ...DEFAULT_CONFIG,
    ...customConfig
  }), [JSON.stringify(customConfig)]);

  const fetchWithRetry = useCallback(async (url, options = {}) => {
    setLoading(true);
    setError(null);

    // 🧪 Development Mode: Bypass authentication ONLY when webapp is running on localhost
    const isLocalDev = typeof window !== 'undefined' && 
                       (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

    // Preserve options immutably across retries to prevent reference loss or mutation
    const fetchOptions = { 
      ...options, 
      headers: { 
        ...options?.headers,
        ...(isLocalDev && { 'X-Debug-Bypass': 'true' }) // Enable bypass ONLY in local dev
      } 
    };
    let attempts = 0;
    
    const executeFetch = async () => {
      try {
        const response = await fetch(url, fetchOptions);
        
        if (response.status === 429) {
          throw new Error('RATE_LIMITED');
        }
        
        if (!response.ok) {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const errorData = await response.json();
            let errMsg = errorData.error || errorData.message || `HTTP Error: ${response.status}`;
            if (errorData.details && Array.isArray(errorData.details)) {
              errMsg += '\\n' + errorData.details.map(d => `• ${d.field}: ${d.message}`).join('\\n');
            }
            throw new Error(errMsg);
          }
          throw new Error(`HTTP Error: ${response.status}`);
        }
        
        const data = await response.json();
        // Return the actual response structure from the backend
        // If backend already has success/error structure, use it directly
        if (data && typeof data === 'object' && 'success' in data) {
          return data;
        }
        // Otherwise wrap it
        return { data, success: true };
      } catch (err) {
        attempts++;
        
        if (err.message === 'RATE_LIMITED') {
          return { error: 'Too many requests. Please wait.', success: false, status: 429 };
        }

        if (attempts < config.retries && (fetchOptions.method === 'GET' || fetchOptions.idempotent)) {
          const delay = config.exponential 
            ? config.retryDelay * Math.pow(2, attempts - 1) 
            : config.retryDelay;
          
          await new Promise(res => setTimeout(res, delay));
          return executeFetch();
        }
        
        setError(err.message);
        return { error: err.message, success: false };
      }
    };

    try {
      return await executeFetch();
    } finally {
      setLoading(false);
    }
  }, [config]);

  return useMemo(() => ({ fetchWithRetry, loading, error }), [fetchWithRetry, loading, error]);
};
