const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || '';
const DEFAULT_TIMEOUT_MS = 15000; // 15-second hard timeout per request

/**
 * 🚀 Production-Grade API Client
 *
 * Features:
 * - Automatic Telegram WebApp initData header injection
 * - AbortController timeout (15s) prevents indefinite gateway hangs
 * - Structured JSON error parsing with safe fallback
 * - Cancellable: pass { signal } in options to override timeout with your own
 */
const apiRequest = async (endpoint, options = {}) => {
  const tg = window.Telegram?.WebApp;
  const initData = tg?.initData || '';

  // 🧪 Development Mode: Bypass authentication for local testing
  const isDevelopment = BACKEND_URL.includes('localhost') || BACKEND_URL.includes('127.0.0.1');

  const headers = {
    'Content-Type': 'application/json',
    'X-Telegram-Init-Data': initData,
    'X-TG-Data': initData,
    ...(isDevelopment && { 'X-Debug-Bypass': 'true' }), // Enable bypass in dev mode
    ...options.headers
  };

  // 🛡️ AbortController: hard timeout to prevent requests hanging indefinitely
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const response = await fetch(`${BACKEND_URL}${endpoint}`, {
      ...options,
      headers,
      // Caller-supplied signal takes precedence (e.g. React component unmount)
      signal: options.signal ?? controller.signal
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      throw new Error(errorBody.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error(`Request timed out after ${DEFAULT_TIMEOUT_MS / 1000}s: ${endpoint}`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
};

export default apiRequest;
export { BACKEND_URL };
