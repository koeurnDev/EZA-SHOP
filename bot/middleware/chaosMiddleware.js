/**
 * 🐒 MO-MO Production-Safe Chaos Engineering Middleware
 * Features:
 * 1. Hard Production Guard: Strictly disabled in NODE_ENV === 'production'.
 * 2. Socket Abort Cleanups: Listens to req/res 'close' events to clear timers and avoid memory leaks or ERR_HTTP_HEADERS_SENT.
 * 3. Pre-parsed Configuration: Evaluates env variables ONCE at module load.
 * 4. Fine-Grained Exclusions: Bypasses health probes (/health, /api/health, /metrics) and static assets to protect container orchestrators.
 */

const isProduction = process.env.NODE_ENV === 'production';

// Pre-parsed environment configuration (Evaluated once at startup)
const CHAOS_CONFIG = {
  enabled: !isProduction && process.env.CHAOS_MODE === 'true',
  latencyMs: Math.max(0, parseInt(process.env.CHAOS_LATENCY_MS || '0', 10) || 0),
  errorRate: Math.max(0, Math.min(1, parseFloat(process.env.CHAOS_ERROR_RATE || '0') || 0))
};

// System paths that MUST NEVER be targeted by Chaos Monkey (protects Liveness/Readiness probes)
const EXCLUDED_PREFIXES = [
  '/health',
  '/api/health',
  '/metrics',
  '/favicon.ico',
  '/robots.txt'
];

const chaosMiddleware = (req, res, next) => {
  // 1. Safety Guard: Hard-locked OFF in Production or if Chaos Mode is disabled
  if (isProduction || !CHAOS_CONFIG.enabled) {
    return next();
  }

  // 2. Fine-Grained Route Filtering (Exclude orchestrator probes)
  const path = req.path || req.originalUrl || '';
  if (EXCLUDED_PREFIXES.some(prefix => path.startsWith(prefix))) {
    return next();
  }

  const wait = CHAOS_CONFIG.latencyMs;
  const shouldFail = CHAOS_CONFIG.errorRate > 0 && Math.random() < CHAOS_CONFIG.errorRate;

  // If no latency delay and no failure, proceed immediately
  if (wait <= 0 && !shouldFail) {
    return next();
  }

  let timer = null;
  let isAborted = false;

  // Cleanup handler for client socket aborts
  const cleanup = () => {
    isAborted = true;
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  };

  req.once('close', cleanup);
  res.once('close', cleanup);

  timer = setTimeout(() => {
    req.off('close', cleanup);
    res.off('close', cleanup);

    // If client already disconnected or headers sent, abort silently
    if (isAborted || res.headersSent) {
      return;
    }

    if (shouldFail) {
      console.warn(`🐒 CHAOS: Injected Fault at ${req.originalUrl || path}`);
      return res.status(500).json({ 
        success: false, 
        error: 'CHAOS_ENGINEERING_FAULT',
        message: '🐒 The Chaos Monkey has injected a synthetic test fault.' 
      });
    }

    next();
  }, wait);
};

module.exports = chaosMiddleware;
