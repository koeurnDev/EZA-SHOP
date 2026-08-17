import { createMiddleware } from 'hono/factory';
import { verifyTelegramAuth, verifySessionToken, isAdmin } from '../utils/auth';
import type { Env, Variables } from '../types';

/**
 * Telegram authentication middleware
 */
export const telegramAuth = createMiddleware<{ Bindings: Env; Variables: Variables }>(async (c, next) => {
  const env = c.env;
  
  // Skip auth in development with DEBUG_ADMIN_BYPASS
  const bypass = c.req.header('X-Debug-Bypass') || c.req.header('x-debug-bypass');
  
  console.log('[AUTH DEBUG]', {
    nodeEnv: env.NODE_ENV,
    bypass: bypass,
    superadminId: env.SUPERADMIN_ID,
    path: c.req.path
  });
  
  // Allow bypass in development OR with special test token
  const testToken = c.req.header('X-Test-Token');
  const isDevBypass = env.NODE_ENV === 'development' && bypass === 'true';
  const isTestToken = testToken === env.TEST_TOKEN && env.TEST_TOKEN; // Only if TEST_TOKEN is set
  
  if (isDevBypass || isTestToken) {
    console.log('[AUTH] Using debug bypass mode');
    c.set('userId', env.SUPERADMIN_ID);
    c.set('isAdmin', true);
    return next();
  }

  const initData = c.req.header('X-Telegram-Init-Data') || c.req.header('x-tg-data') || c.req.header('X-TG-Data') || c.req.header('x-telegram-init-data');
  const authHeader = c.req.header('Authorization');

  let userId: string | null = null;

  // Verify Telegram init data cryptographically
  if (initData) {
    const telegramData = await verifyTelegramAuth(initData, env.BOT_TOKEN);
    if (telegramData?.user?.id) {
      userId = telegramData.user.id.toString();
    }
  }
  
  // Try JWT token if no Telegram auth
  if (!userId && authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const sessionData = await verifySessionToken(token, env);
    if (sessionData) {
      userId = sessionData.userId;
    }
  }

  if (!userId) {
    return c.json({ error: 'Unauthorized', message: 'Valid authentication required' }, 401);
  }

  c.set('userId', userId);
  c.set('isAdmin', isAdmin(userId, env));
  
  await next();
});

import { createDb } from '../db/connection';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';

/**
 * Admin-only middleware
 */
export const adminAuth = createMiddleware<{ Bindings: Env; Variables: Variables }>(async (c, next) => {
  const userIsAdmin = c.get('isAdmin');
  
  if (userIsAdmin) {
    return next();
  }
  
  const userId = c.get('userId');
  if (!userId) {
    return c.json({ error: 'Unauthorized', message: 'Valid authentication required' }, 401);
  }

  const db = createDb(c.env);
  const currentUser = await db.select({ role: users.role }).from(users).where(eq(users.user_id, userId)).limit(1);
  
  if (currentUser.length > 0 && (currentUser[0].role === 'admin' || currentUser[0].role === 'staff')) {
    return next();
  }
  
  return c.json({ error: 'Forbidden', message: 'Admin access required' }, 403);
});

/**
 * CORS middleware
 */
export const cors = createMiddleware(async (c, next) => {
  const allowedHeaders = 'Content-Type, Authorization, X-Telegram-Init-Data, X-TG-Data, x-tg-data, X-Debug-Bypass, X-Test-Token';

  // Handle preflight requests
  if (c.req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': allowedHeaders,
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  await next();

  // Add CORS headers to all responses
  c.res.headers.set('Access-Control-Allow-Origin', '*');
  c.res.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  c.res.headers.set('Access-Control-Allow-Headers', allowedHeaders);
});