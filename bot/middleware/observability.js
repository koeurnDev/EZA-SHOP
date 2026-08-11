const { v4: uuidv4 } = require('uuid');

/**
 * Principal-Grade Observability Middleware (V2)
 * Features:
 * 1. Safe HTTP Event Listeners (res.once('finish')) without monkey-patching res.end.
 * 2. Pure JSON Log Lines (Strictly formatted for Datadog / ELK / CloudWatch).
 * 3. PII & Sensitive Field Redaction (Protects passwords, tokens, and session keys).
 */

const SENSITIVE_KEYS = new Set([
  'password', 'token', 'authorization', 'secret', 'card', 'credit_card', 
  'cvv', 'cvc', 'initdata', 'session', 'x-tg-data', 'auth'
]);

const sanitizePII = (data) => {
  if (!data || typeof data !== 'object') return data;
  if (Array.isArray(data)) return data.map(sanitizePII);
  
  const clean = {};
  for (const [key, val] of Object.entries(data)) {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_KEYS.has(lowerKey) || lowerKey.includes('pass') || lowerKey.includes('secret')) {
      clean[key] = '[REDACTED]';
    } else if (typeof val === 'object' && val !== null) {
      clean[key] = sanitizePII(val);
    } else {
      clean[key] = val;
    }
  }
  return clean;
};

const observabilityLogger = (req, res, next) => {
  const start = process.hrtime();
  req.id = req.get('X-Request-ID') || uuidv4();
  res.set('X-Request-ID', req.id);

  // Safe HTTP event listener: Avoid monkey-patching res.end to protect streaming & pipelines
  res.once('finish', () => {
    const diff = process.hrtime(start);
    const durationMs = parseFloat((diff[0] * 1e3 + diff[1] * 1e-6).toFixed(2));
    
    let level = 'info';
    if (res.statusCode >= 500) level = 'error';
    else if (res.statusCode >= 400 || durationMs > 200) level = 'warn';

    const log = {
      level,
      type: 'http_request',
      id: req.id,
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.originalUrl || req.url,
      status: res.statusCode,
      durationMs,
      ua: req.get('User-Agent') || 'unknown',
      ip: req.ip || req.get('X-Forwarded-For') || req.socket?.remoteAddress || '127.0.0.1'
    };

    // Output pure single-line JSON string without emoji prefixes for log aggregators
    const output = JSON.stringify(log);
    if (level === 'error') console.error(output);
    else if (level === 'warn') console.warn(output);
    else console.log(output);
  });

  next();
};

const telemetryHandler = (req, res) => {
  const telemetryData = sanitizePII(req.body || {});

  // Output pure single-line JSON payload for log collectors
  console.log(JSON.stringify({
    level: 'info',
    type: 'telemetry_event',
    server_timestamp: new Date().toISOString(),
    payload: telemetryData
  }));

  res.status(202).json({ success: true });
};

module.exports = {
  observabilityLogger,
  telemetryHandler,
  sanitizePII
};
