import jwt from '@tsndr/cloudflare-worker-jwt';
import type { Env, TelegramInitData } from '../types';

/**
 * Simple authentication bypass for development
 * In production, implement proper Telegram auth verification
 */
/**
 * Cryptographically verify Telegram Mini App initData using Web Crypto API HMAC-SHA256
 */
export async function verifyTelegramAuth(initData: string, botToken: string): Promise<TelegramInitData | null> {
  try {
    const urlParams = new URLSearchParams(initData);
    const hash = urlParams.get('hash');
    const userData = urlParams.get('user');
    const authDate = urlParams.get('auth_date');

    if (!userData) {
      return null;
    }

    // In local development or testing without bot token verification
    if (!botToken || botToken === 'test') {
      return {
        user: JSON.parse(userData),
        auth_date: authDate ? parseInt(authDate, 10) : Math.floor(Date.now() / 1000),
        hash: hash || 'mock_hash',
      };
    }

    if (!hash) {
      return null;
    }

    // Build data-check-string (all keys except hash sorted alphabetically)
    const checkString = Array.from(urlParams.entries())
      .filter(([key]) => key !== 'hash')
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, val]) => `${key}=${val}`)
      .join('\n');

    const encoder = new TextEncoder();

    // secret_key = HMAC_SHA256("WebAppData", botToken)
    const secretKeyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode('WebAppData'),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const secretKey = await crypto.subtle.sign('HMAC', secretKeyMaterial, encoder.encode(botToken));

    // calculated_hash = HMAC_SHA256(secretKey, checkString)
    const key = await crypto.subtle.importKey(
      'raw',
      secretKey,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(checkString));
    const calculatedHash = Array.from(new Uint8Array(signature))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    if (calculatedHash !== hash) {
      console.warn('Telegram auth signature mismatch');
      return null;
    }

    return {
      user: JSON.parse(userData),
      auth_date: parseInt(authDate || '0', 10),
      hash,
    };
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