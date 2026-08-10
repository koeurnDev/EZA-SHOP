const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { validateInitData } = require('../utils/auth');

/**
 * Principal-Grade Security Layer (V2)
 * Features: Short-lived JWT Session Tokens, Telegram HMAC Validation, and Dev Bypass.
 * Zero-Trust Session Management.
 */

// 🛡 Security: Use dynamic secure random string if not provided in environment
const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');
const SESSION_EXPIRY = '2h'; // Short sessions for maximum safety

const checkBypass = () => {
  // 🛡 Strict Security: Bypass ONLY allowed in explicitly designated development environments
  const isDev = process.env.NODE_ENV === 'development';
  const isBypassEnabled = process.env.DEBUG_ADMIN_BYPASS === 'true';
  
  if (!isDev) return false;
  
  return isBypassEnabled;
};

/**
 * Middleware: verifyUser
 * Authenticates requests via X-TG-Data (Direct Telegram) or Authorization (JWT).
 */
const verifyUser = async (req, res, next) => {
  const authHeader = req.get('Authorization');
  const initData = req.get('X-TG-Data');

  // 1. Direct Telegram InitData validation
  if (initData) {
    const isValid = validateInitData(initData, process.env.BOT_TOKEN);
    if (!isValid && !checkBypass()) {
      return res.status(401).json({ success: false, error: 'Invalid Session' });
    }

    const params = new URLSearchParams(initData || '');
    let user = {};
    try {
      user = JSON.parse(params.get('user') || '{}');
    } catch (err) {
      console.warn('⚠️ Auth: Failed to parse user from initData');
    }
    
    // 🛡 Sync: If it's first-time or refresh, generate a transient session token
    const token = jwt.sign({ id: user.id, username: user.username }, SESSION_SECRET, { expiresIn: SESSION_EXPIRY });
    res.set('X-Session-Token', token);
    
    // 🛡 Ban Check
    try {
      const userRepository = require('../repositories/userRepository');
      if (await userRepository.isBanned(user.id)) {
        return res.status(403).json({ success: false, error: 'គណនីរបស់អ្នកត្រូវបានផ្អាក (Account Banned)', code: 'BANNED' });
      }
    } catch (e) {
      console.warn('⚠️ Auth: Failed to check ban status');
    }

    req.user = { user_id: Number(user.id), ...user };
    req.tgUser = user;
    return next();
  }

  // 2. JWT Session Token validation (Fast path)
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, SESSION_SECRET);
      
      // 🛡 Ban Check
      try {
        const userRepository = require('../repositories/userRepository');
        if (await userRepository.isBanned(decoded.id)) {
          return res.status(403).json({ success: false, error: 'គណនីរបស់អ្នកត្រូវបានផ្អាក (Account Banned)', code: 'BANNED' });
        }
      } catch (e) {
        console.warn('⚠️ Auth: Failed to check ban status');
      }

      req.user = { user_id: decoded.id, username: decoded.username };
      req.tgUser = { id: decoded.id, username: decoded.username };
      return next();
    } catch (e) {
      return res.status(401).json({ success: false, error: 'Session Expired', code: 'TOKEN_EXPIRED' });
    }
  }

  // 3. Last Resort: Dev Bypass
  if (checkBypass()) {
    console.warn('🛠️ Auth: Debug Bypass Active');
    const devUser = { id: Number(process.env.SUPERADMIN_ID), first_name: 'DevTester' };
    req.user = { user_id: devUser.id, ...devUser };
    req.tgUser = devUser;
    return next();
  }

  return res.status(401).json({ success: false, error: 'Auth Required' });
};

const isStaffOrAdmin = (req, res, next) => {
  // Principal: Re-use verifyUser logic then check SuperAdmin ID or Role
  verifyUser(req, res, async () => {
    if (Number(req.user.user_id) === Number(process.env.SUPERADMIN_ID)) {
      return next();
    }
    try {
      const userRepository = require('../repositories/userRepository');
      const dbUser = await userRepository.findById(String(req.user.user_id));
      if (dbUser && (dbUser.role === 'admin' || dbUser.role === 'staff')) {
        return next();
      }
    } catch (e) {
      console.warn('⚠️ Auth: Failed to check user role');
    }
    res.status(403).json({ success: false, error: 'Access Denied: Staff/Admin Only' });
  });
};

const isSuperAdminOnly = (req, res, next) => {
  verifyUser(req, res, async () => {
    if (Number(req.user.user_id) === Number(process.env.SUPERADMIN_ID)) {
      return next();
    }
    try {
      const userRepository = require('../repositories/userRepository');
      const dbUser = await userRepository.findById(String(req.user.user_id));
      if (dbUser && dbUser.role === 'admin') {
        return next();
      }
    } catch (e) {
      console.warn('⚠️ Auth: Failed to check superadmin role');
    }
    res.status(403).json({ success: false, error: 'Access Denied: SuperAdmin Only' });
  });
};

module.exports = { isStaffOrAdmin, isSuperAdminOnly, verifyUser };
