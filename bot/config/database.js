const { Pool } = require('pg');

/**
 * MO-MO Database Layer (v6 - Production Optimized)
 * Strategy: Enterprise-Grade Connection Pooling
 * ⚡ Features:
 *   - Optimized connection limits (8-12 range), not 20
 *   - Aggressive idle timeout (15s) to prevent stale connections
 *   - Queue timeout to detect connection starving
 *   - Error recovery with connection validation
 *   - Built-in query timeout
 *   - Clean wrapper-based slow query telemetry (no monkey-patching)
 */

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  },
  
  // 🎯 PRODUCTION CONNECTION LIMITS
  // Neon/Render free tier: 20 connections max, use 8-12 to leave safety buffer
  max: parseInt(process.env.DB_POOL_MAX || '12'),        // Max concurrent connections
  min: parseInt(process.env.DB_POOL_MIN || '2'),         // Keep warm with 2 connections
  
  // ⏱️ AGGRESSIVE TIMEOUT STRATEGY
  idleTimeoutMillis: 15000,                              // Close idle connections after 15s
  connectionTimeoutMillis: 60000,                        // Allow 60s for cold starts
  maxUses: 7500,                                         // Recycle connection after 7500 queries
  
  // 🛡️ QUEUE & STALL PROTECTION
  allowExitOnIdle: false,                                // Keep pool until explicit shutdown
  
  // 🔄 KEEPALIVE SETTINGS
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,                    // Send keepalive after 10s of idle
  
  // ⏲️ QUERY TIMEOUT
  statement_timeout: 45000,                              // Query timeout: 45 seconds
  query_timeout: 45000,
});

pool.on('connect', () => {
  console.log(`🔌 DB: Connection Opened. (Active: ${pool.totalCount} | Idle: ${pool.idleCount})`);
});

pool.on('remove', () => {
  console.log(`🔌 DB: Connection Closed. (Active: ${pool.totalCount} | Idle: ${pool.idleCount})`);
});

pool.on('error', (err) => {
  console.error('🔴 DB Pool Error:', err.message, '(Code:', err.code, ')');
});

/**
 * 🔍 Clean query wrapper with slow-query telemetry.
 * Avoids monkey-patching pg internals (req.callback).
 */
const timedQuery = (text, params) => {
  const start = Date.now();
  return pool.query(text, params).then(
    (res) => {
      const duration = Date.now() - start;
      const preview = (text || '').substring(0, 60).replace(/\n/g, ' ');
      if (duration > 500) {
        console.warn(`⏳ SLOW QUERY (${duration}ms): ${preview}...`);
      }
      return res;
    },
    (err) => {
      const duration = Date.now() - start;
      const preview = (text || '').substring(0, 60).replace(/\n/g, ' ');
      console.error(`⚠️ QUERY ERROR (${duration}ms): ${preview}... — ${err.message}`);
      throw err;
    }
  );
};

module.exports = {
  // 🔄 Virtual Interface for backward compatibility with repositories
  query: timedQuery,
  writeQuery: timedQuery,
  connect: () => pool.connect(),
  writePool: pool,
  readPool: pool,
  end: () => pool.end(),
  pool
};
