import { createMiddleware } from 'hono/factory';
import { verifyTelegramAuth, verifySessionToken, isAdmin } from '../utils/auth';
import type { Env, Variables } from '../types';

/**
 * Telegram authentication middleware
 */
export const telegramAuth = createMiddleware<{ Bindings: Env; Variables: Variables }>(async (c, next) => {
  const env = c.env;
  
  // Skip auth in development with DEBUG_ADMIN_BYPASS
  if (env.NODE_ENV === 'development') {
    const bypass = c.req.header('X-Debug-Bypass');
    if (bypass === 'true') {
      c.set('userId', env.SUPERADMIN_ID);
      c.set('isAdmin', true);
      return next();
    }
  }

  const initData = c.req.header('X-Telegram-Init-Data');
  const authHeader = c.req.header('Authorization');

  let userId: string | null = null;

  // Try Telegram init data first
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

/**
 * Admin-only middleware
 */
export const adminAuth = createMiddleware<{ Bindings: Env; Variables: Variables }>(async (c, next) => {
  const userIsAdmin = c.get('isAdmin');
  
  if (!userIsAdmin) {
    return c.json({ error: 'Forbidden', message: 'Admin access required' }, 403);
  }
  
  await next();
});

/**
 * CORS middleware
 */
export const cors = createMiddleware(async (c, next) => {
  // Handle preflight requests
  if (c.req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Telegram-Init-Data, X-Debug-Bypass',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  await next();

  // Add CORS headers to all responses
  c.res.headers.set('Access-Control-Allow-Origin', '*');
  c.res.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  c.res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Telegram-Init-Data, X-Debug-Bypass');
});