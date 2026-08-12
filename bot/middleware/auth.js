const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { validateInitData } = require('../utils/auth');
const userRepository = require('../repositories/userRepository');

/**
 * Principal-Grade Zero-Trust Authentication Layer (V3)
 * Features:
 * 1. Persistent Session Secret (Deterministic Fallback across Restarts).
 * 2. Strict HMAC Validation (Unverified Telegram initData is NEVER parsed into tokens).
 * 3. Top-Level Imports for High Throughput.
 * 4. Clean Composable Express Middleware.
 */

// 🛡️ Deterministic Secret: Survives server restarts to prevent session drop crashes
const SESSION_SECRET = process.env.SESSION_SECRET || (
  process.env.BOT_TOKEN 
    ? crypto.createHash('sha256').update(process.env.BOT_TOKEN).digest('hex')
    : 'MO_MO_BOUTIQUE_SECURE_JWT_SESSION_SECRET_2026'
);

const SESSION_EXPIRY = '2h'; // Short-lived sessions for maximum safety

const checkBypass = () => {
  const isDev = process.env.NODE_ENV === 'development';
  const isBypassEnabled = process.env.DEBUG_ADMIN_BYPASS === 'true';
  return isDev && isBypassEnabled;
};

/**
 * Middleware: verifyUser
 * Authenticates requests via X-TG-Data (Telegram HMAC) or Authorization (JWT).
 */
const verifyUser = async (req, res, next) => {
  if (req.user && req.tgUser) return next();

  const authHeader = req.get('Authorization');
  const initData = req.get('X-TG-Data') || (req.method === 'GET' ? req.query.tg : null);

  // 1. Direct Telegram InitData validation
  if (initData) {
    const isValid = validateInitData(initData, process.env.BOT_TOKEN);
    let user = {};

    if (isValid) {
      const params = new URLSearchParams(initData);
      try {
        user = JSON.parse(params.get('user') || '{}');
      } catch (err) {
        console.warn('⚠️ Auth: Failed to parse user from initData');
        return res.status(400).json({ success: false, error: 'Malformed User Payload' });
      }
    } else if (checkBypass()) {
      console.warn('🛠️ Auth: Development Bypass Active for Invalid InitData');
      user = { id: Number(process.env.SUPERADMIN_ID) || 12345678, first_name: 'DevTester' };
    } else {
      return res.status(401).json({ success: false, error: 'Invalid Session' });
    }

    if (!user.id) {
      return res.status(401).json({ success: false, error: 'User Identity Missing' });
    }

    // 🛡 Sync: Issue transient session token for valid authenticated user
    const token = jwt.sign({ id: user.id, username: user.username }, SESSION_SECRET, { expiresIn: SESSION_EXPIRY });
    res.set('X-Session-Token', token);
    
    // 🛡 Ban Check
    try {
      if (await userRepository.isBanned(user.id)) {
        return res.status(403).json({ success: false, error: 'គណនីរបស់អ្នកត្រូវបានផ្អាក (Account Banned)', code: 'BANNED' });
      }
    } catch (e) {
      console.warn('⚠️ Auth: Failed to check ban status:', e.message);
    }

    req.user = { user_id: Number(user.id), ...user };
    req.tgUser = user;

    // ⚡ Auto-sync Telegram Profile (photo, name, username) in background
    const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ') || user.username || null;
    userRepository.updateLastSeen(String(user.id), fullName, user.photo_url || null, user.username || null).catch(() => {});
    const telegramAvatarService = require('../services/telegramAvatarService');
    telegramAvatarService.refreshUserAvatar(String(user.id)).catch(() => {});

    return next();
  }

  // 2. JWT Session Token validation (Fast path)
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, SESSION_SECRET);
      
      // 🛡 Ban Check
      try {
        if (await userRepository.isBanned(decoded.id)) {
          return res.status(403).json({ success: false, error: 'គណនីរបស់អ្នកត្រូវបានផ្អាក (Account Banned)', code: 'BANNED' });
        }
      } catch (e) {
        console.warn('⚠️ Auth: Failed to check ban status:', e.message);
      }

      req.user = { user_id: Number(decoded.id), username: decoded.username };
      req.tgUser = { id: Number(decoded.id), username: decoded.username };
      return next();
    } catch (e) {
      return res.status(401).json({ success: false, error: 'Session Expired', code: 'TOKEN_EXPIRED' });
    }
  }

  // 3. Last Resort: Dev Bypass
  if (checkBypass()) {
    console.warn('🛠️ Auth: Debug Bypass Active');
    const devUser = { id: Number(process.env.SUPERADMIN_ID) || 12345678, first_name: 'DevTester' };
    req.user = { user_id: devUser.id, ...devUser };
    req.tgUser = devUser;
    return next();
  }

  return res.status(401).json({ success: false, error: 'Auth Required' });
};

/**
 * Helper to check role after verifyUser completes
 */
const checkUserRole = async (req, res, next, requiredRole = 'staff') => {
  const userId = Number(req.user?.user_id);
  const superAdminId = Number(process.env.SUPERADMIN_ID);

  if (userId === superAdminId) return next();

  try {
    const dbUser = await userRepository.findById(String(userId));
    if (dbUser) {
      if (requiredRole === 'admin' && dbUser.role === 'admin') return next();
      if (requiredRole === 'staff' && (dbUser.role === 'admin' || dbUser.role === 'staff')) return next();
    }
  } catch (e) {
    console.warn('⚠️ Auth: Failed to check user role:', e.message);
  }

  return res.status(403).json({ 
    success: false, 
    error: `Access Denied: ${requiredRole === 'admin' ? 'Admin' : 'Staff/Admin'} Only` 
  });
};

const isStaffOrAdmin = (req, res, next) => {
  if (req.user) return checkUserRole(req, res, next, 'staff');
  return verifyUser(req, res, () => checkUserRole(req, res, next, 'staff'));
};

const isSuperAdminOnly = (req, res, next) => {
  if (req.user) return checkUserRole(req, res, next, 'admin');
  return verifyUser(req, res, () => checkUserRole(req, res, next, 'admin'));
};

module.exports = { isStaffOrAdmin, isSuperAdminOnly, verifyUser };
