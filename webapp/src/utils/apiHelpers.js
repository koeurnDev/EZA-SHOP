/**
 * Helper: Add debug bypass header for local development
 * Use this for all direct fetch() calls that need authentication
 */
export const getHeaders = (BACKEND_URL, initData, extraHeaders = {}) => {
  // Check if we're in actual local development (webapp running in dev mode, including LAN)
  const isLocalDev = import.meta.env.DEV;
  
  return {
    'X-TG-Data': initData || '',
    ...(isLocalDev && { 'X-Debug-Bypass': 'true' }),
    ...extraHeaders
  };
};

/**
 * Helper: Fetch with automatic bypass header injection
 */
export const fetchWithBypass = async (url, options = {}) => {
  // Check if we're in actual local development (webapp running in dev mode, including LAN)
  const isLocalDev = import.meta.env.DEV;
  
  const headers = {
    ...(options.headers || {}),
    ...(isLocalDev && { 'X-Debug-Bypass': 'true' })
  };

  return fetch(url, {
    ...options,
    headers
  });
};
