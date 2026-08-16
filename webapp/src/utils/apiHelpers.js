/**
 * Helper: Add debug bypass header for local development
 * Use this for all direct fetch() calls that need authentication
 */
export const getHeaders = (BACKEND_URL, initData, extraHeaders = {}) => {
  const isDevelopment = BACKEND_URL?.includes('localhost') || BACKEND_URL?.includes('127.0.0.1');
  return {
    'X-TG-Data': initData || '',
    ...(isDevelopment && { 'X-Debug-Bypass': 'true' }),
    ...extraHeaders
  };
};

/**
 * Helper: Fetch with automatic bypass header injection
 */
export const fetchWithBypass = async (url, options = {}) => {
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || '';
  const isDevelopment = BACKEND_URL.includes('localhost') || BACKEND_URL.includes('127.0.0.1');
  
  const headers = {
    ...(options.headers || {}),
    ...(isDevelopment && { 'X-Debug-Bypass': 'true' })
  };

  return fetch(url, {
    ...options,
    headers
  });
};
