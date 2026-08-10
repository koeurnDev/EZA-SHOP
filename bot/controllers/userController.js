const userRepository = require('../repositories/userRepository');

const userController = {
  getProfile: async (req, res) => {
    try {
      const tgUser = req.user; // Injected by verifyUser middleware
      if (!tgUser || !tgUser.id) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      const userProfile = await userRepository.findById(tgUser.id);
      
      // If user not found in DB (never ordered), just return basic TG info
      if (!userProfile) {
        return res.json({ 
          success: true, 
          profile: {
            user_id: tgUser.id,
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
      const tgUser = req.user;
      if (!tgUser || !tgUser.id) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      const { phone, address } = req.body;
      
      // Upsert the user profile
      const updatedUser = await userRepository.upsert(tgUser.id, phone || '', address || '');

      res.json({ success: true, profile: updatedUser });
    } catch (error) {
      console.error('Error updating user profile:', error);
      res.status(500).json({ success: false, error: 'Failed to update profile' });
    }
  },

  // 🟢 Ping: silently update last_seen for the current user
  ping: async (req, res) => {
    try {
      const tgUser = req.tgUser || req.user;
      if (!tgUser?.id) return res.json({ success: true }); // Graceful no-op
      const userName = tgUser.first_name || tgUser.username || null;
      await userRepository.updateLastSeen(String(tgUser.id), userName);
      res.json({ success: true });
    } catch (err) {
      // Non-critical — always return 200 so frontend doesn't retry aggressively
      res.json({ success: true });
    }
  }
};

module.exports = userController;
