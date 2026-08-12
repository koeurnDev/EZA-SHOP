const userRepository = require('../repositories/userRepository');
const cacheService = require('../services/cacheService');

const getResolvedUserId = (req) => {
  return req.user?.user_id || req.user?.id || req.tgUser?.id;
};

const userController = {
  getProfile: async (req, res) => {
    try {
      const userId = getResolvedUserId(req);
      if (!userId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      // ⚡ High-Performance Cache Layer (5 min TTL)
      const userProfile = await cacheService.getOrFetch(`user:profile:${userId}`, async () => {
        return await userRepository.findById(userId);
      }, 300);
      
      // If user not found in DB (never ordered), return basic fallback profile
      if (!userProfile) {
        return res.json({ 
          success: true, 
          profile: {
            user_id: userId,
            loyalty_points: 0,
            phone: '',
            address: ''
          }
        });
      }

      res.json({ success: true, profile: userProfile });
    } catch (error) {
      console.error('Error fetching user profile:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch profile' });
    }
  },

  updateProfile: async (req, res) => {
    try {
      const userId = getResolvedUserId(req);
      if (!userId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      const { phone, address } = req.body;
      const trimmedPhone = phone ? String(phone).trim() : '';
      const trimmedAddress = address ? String(address).trim() : '';

      // 🛡️ Input Validation Guards
      if (trimmedPhone && !/^[0-9\s\+\-\(\)]{8,15}$/.test(trimmedPhone)) {
        return res.status(400).json({ success: false, error: 'Invalid phone number format. Must be 8-15 digits.' });
      }

      if (trimmedAddress.length > 500) {
        return res.status(400).json({ success: false, error: 'Address exceeds maximum allowed length of 500 characters.' });
      }
      
      // Upsert the user profile
      const updatedUser = await userRepository.upsert(userId, trimmedPhone, trimmedAddress);

      // 🚀 Invalidate cached user profile on update
      cacheService.delete(`user:profile:${userId}`);

      res.json({ success: true, profile: updatedUser });
    } catch (error) {
      console.error('Error updating user profile:', error);
      res.status(500).json({ success: false, error: 'Failed to update profile' });
    }
  },

  // 🟢 Ping: silently update last_seen, profile photo, and name for the current user
  ping: async (req, res) => {
    try {
      const userId = getResolvedUserId(req);
      if (!userId) return res.json({ success: true }); // Graceful no-op

      const tgUser = req.tgUser || req.user || {};
      const userName = [tgUser.first_name, tgUser.last_name].filter(Boolean).join(' ') || tgUser.username || null;
      const photoUrl = tgUser.photo_url || null;
      const username = tgUser.username || null;

      await userRepository.updateLastSeen(String(userId), userName, photoUrl, username);
      res.json({ success: true });
    } catch (err) {
      // Non-critical — always return 200 so frontend doesn't retry aggressively
      res.json({ success: true });
    }
  }
};

module.exports = userController;
