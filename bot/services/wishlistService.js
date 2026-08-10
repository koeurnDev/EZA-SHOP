const wishlistRepository = require('../repositories/wishlistRepository');

const wishlistService = {
  getWishlist: async (userId, requesterId) => {
    if (String(userId) !== String(requesterId)) {
      throw new Error('Access Denied');
    }
    return await wishlistRepository.findByUserId(userId);
  },

  toggleWishlist: async (userId, productId, requesterId) => {
    if (String(userId) !== String(requesterId)) {
      throw new Error('Access Denied');
    }

    const hasItem = await wishlistRepository.exists(userId, productId);
    if (hasItem) {
      await wishlistRepository.remove(userId, productId);
      return { added: false };
    } else {
      // 🛡️ Security Check: Prevent wishlist DDoS/spam
      const currentCount = await wishlistRepository.countByUserId(userId);
      if (currentCount >= 50) {
        throw new Error('Limit Reached: អ្នកមិនអាចបន្ថែមទំនិញចូលចំណូលចិត្តលើសពី ៥០ មុខបានទេ (Wishlist full)');
      }
      
      await wishlistRepository.add(userId, productId);
      return { added: true };
    }
  }
};

module.exports = wishlistService;
