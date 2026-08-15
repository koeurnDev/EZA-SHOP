import jwt from '@tsndr/cloudflare-worker-jwt';
import type { Env, TelegramInitData } from '../types';

/**
 * Simple authentication bypass for development
 * In production, implement proper Telegram auth verification
 */
export async function verifyTelegramAuth(initData: string, botToken: string): Promise<TelegramInitData | null> {
  try {
    // For now, return a mock user for development
    // TODO: Implement proper Telegram auth verification using Web Crypto API
    const urlParams = new URLSearchParams(initData);
    const userData = urlParams.get('user');
    
    if (userData) {
      return {
        user: JSON.parse(userData),
        auth_date: Math.floor(Date.now() / 1000),
        hash: 'mock_hash',
      };
    }
    
    return null;
  } catch (error) {
    console.error('Telegram auth verification failed:', error);
    return null;
  }
}

/**
 * Generate session JWT token
 */
export async function generateSessionToken(userId: string, env: Env): Promise<string> {
  return await jwt.sign(
    { userId, iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 604800 },
    env.SESSION_SECRET
  );
}

/**
 * Verify session JWT token
 */
export async function verifySessionToken(token: string, env: Env): Promise<{ userId: string } | null> {
  try {
    const isValid = await jwt.verify(token, env.SESSION_SECRET);
    if (isValid) {
      const payload = jwt.decode(token) as any;
      return { userId: payload.payload?.userId };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Check if user is admin
 */
export function isAdmin(userId: string, env: Env): boolean {
  return userId === env.SUPERADMIN_ID;
}