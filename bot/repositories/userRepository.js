const pool = require('../config/database');
const { encrypt, decrypt } = require('../utils/crypto');
const { redisClient } = require('../config/redis');

const userRepository = {
  findById: async (id) => {
    const res = await pool.query('SELECT * FROM users WHERE user_id = $1', [id]);
    const user = res.rows[0];
    if (user) {
      user.phone = decrypt(user.phone);
      user.address = decrypt(user.address);
    }
    return user;
  },

  findAll: async () => {
    // 🛡️ Self-Healing: Ensure role, is_banned, and is_winback_reminded columns exist
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user'`).catch(() => {});
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT false`).catch(() => {});
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_winback_reminded BOOLEAN DEFAULT false`).catch(() => {});
    
    const res = await pool.query('SELECT * FROM users ORDER BY last_seen DESC NULLS LAST, last_updated DESC');
    return res.rows;
  },

  getAllIds: async () => {
    const res = await pool.query('SELECT user_id FROM users');
    return res.rows.map(r => r.user_id);
  },

  updateRole: async (userId, role) => {
    const res = await pool.query(
      'UPDATE users SET role = $1, last_updated = CURRENT_TIMESTAMP WHERE user_id = $2 RETURNING *',
      [role, userId]
    );
    return res.rows[0];
  },

  deleteUser: async (userId) => {
    // Delete orders first (cascade)
    await pool.query('DELETE FROM orders WHERE user_id = $1', [userId]).catch(() => {});
    await pool.query('DELETE FROM users WHERE user_id = $1', [userId]);
    return true;
  },

  updateBanStatus: async (userId, isBanned) => {
    const res = await pool.query(
      'UPDATE users SET is_banned = $1, last_updated = CURRENT_TIMESTAMP WHERE user_id = $2 RETURNING *',
      [isBanned, userId]
    );
    // ⚡ Redis Smart Cache: Clear the cache instantly so zero-trust session remains strict
    if (redisClient && redisClient.isOpen) {
      await redisClient.del(`ban_status:${userId}`).catch(e => console.warn('⚠️ Redis Error:', e.message));
    }
    return res.rows[0];
  },

  isBanned: async (userId) => {
    // ⚡ Redis Smart Cache: Extremely fast RAM lookups
    const cacheKey = `ban_status:${userId}`;
    if (redisClient && redisClient.isOpen) {
      try {
        const cached = await redisClient.get(cacheKey);
        if (cached !== null) return cached === 'true';
      } catch (e) {
        console.warn('⚠️ Redis Cache Error:', e.message);
      }
    }

    const res = await pool.query('SELECT is_banned FROM users WHERE user_id = $1', [userId]);
    const isBanned = res.rows[0]?.is_banned === true;

    // Cache the result for 5 minutes (300 seconds)
    if (redisClient && redisClient.isOpen) {
      redisClient.setEx(cacheKey, 300, isBanned ? 'true' : 'false').catch(() => {});
    }

    return isBanned;
  },

  findInactiveUsers: async (days = 30) => {
    const res = await pool.query(`
      SELECT * FROM users 
      WHERE last_seen < NOW() - (INTERVAL '1 day' * $1)
      AND is_winback_reminded = false
    `, [days]);
    return res.rows;
  },

  markAsWinbackReminded: async (userId) => {
    await pool.query('UPDATE users SET is_winback_reminded = true WHERE user_id = $1', [userId]);
  },

  upsert: async (id, phone, address) => {
    const encPhone = encrypt(phone);
    const encAddress = encrypt(address);
    // Create a dummy email for Telegram users to satisfy the NOT NULL constraint
    const dummyEmail = `tg_${id}@momo.local`;
    const res = await pool.query(
      `INSERT INTO users (user_id, phone, address, email, last_updated, loyalty_points) 
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, 0)
       ON CONFLICT (user_id) DO UPDATE SET phone = $2, address = $3, last_updated = CURRENT_TIMESTAMP RETURNING *`,
      [id, encPhone, encAddress, dummyEmail]
    );
    const user = res.rows[0];
    if (user) {
      user.phone = decrypt(user.phone);
      user.address = decrypt(user.address);
    }
    return user;
  },

  addLoyaltyPoints: async (userId, points) => {
    const res = await pool.query(
      'UPDATE users SET loyalty_points = loyalty_points + $1, last_updated = CURRENT_TIMESTAMP WHERE user_id = $2 RETURNING *',
      [points, userId]
    );
    return res.rows[0];
  },

  getCount: async () => {
    const res = await pool.query('SELECT COUNT(*) as count FROM users');
    return parseInt(res.rows[0]?.count || 0);
  },

  // 🟢 Track user activity: upsert user with last_seen = NOW()
  updateLastSeen: async (userId, userName) => {
    try {
      // 🛡️ Self-Healing: Ensure last_seen column exists
      await pool.query(`
        ALTER TABLE users ADD COLUMN IF NOT EXISTS last_seen TIMESTAMPTZ;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS user_name TEXT;
      `).catch(() => {});

      const dummyEmail = `tg_${userId}@momo.local`;
      await pool.query(
        `INSERT INTO users (user_id, user_name, email, phone, address, loyalty_points, last_seen, last_updated)
         VALUES ($1, $2, $3, '', '', 0, NOW(), NOW())
         ON CONFLICT (user_id) DO UPDATE SET
           last_seen = NOW(),
           last_updated = NOW(),
           user_name = COALESCE(EXCLUDED.user_name, users.user_name)`,
        [userId, userName || null, dummyEmail]
      );
    } catch (err) {
      // Non-critical — don't throw, just log
      console.warn('⚠️ updateLastSeen failed (non-critical):', err.message);
    }
  },

  // 🟢 Get users active within N minutes (default 5 = online, 60 = recent)
  getOnlineUsers: async (minutes = 5) => {
    try {
      const res = await pool.query(
        `SELECT user_id, user_name, last_seen
         FROM users
         WHERE last_seen > NOW() - ($1 || ' minutes')::INTERVAL
         ORDER BY last_seen DESC`,
        [minutes]
      );
      return res.rows;
    } catch (err) {
      console.warn('⚠️ getOnlineUsers failed (non-critical):', err.message);
      return [];
    }
  }
};

module.exports = userRepository;
