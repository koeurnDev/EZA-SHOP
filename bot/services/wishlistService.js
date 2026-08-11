const wishlistRepository = require('../repositories/wishlistRepository');
const { ForbiddenError, ValidationError } = require('../utils/errors');

const wishlistService = {
  getWishlist: async (userId, requesterId) => {
    const isAdmin = String(requesterId) === String(process.env.SUPERADMIN_ID);
    if (!isAdmin && String(userId) !== String(requesterId)) {
      throw new ForbiddenError("Access Denied: Cannot access another user's wishlist");
    }
    return await wishlistRepository.findByUserId(userId);
  },

  toggleWishlist: async (userId, productId, requesterId) => {
    if (String(userId) !== String(requesterId)) {
      throw new ForbiddenError("Access Denied: Cannot modify another user's wishlist");
    }

    const hasItem = await wishlistRepository.exists(userId, productId);
    if (hasItem) {
      await wishlistRepository.remove(userId, productId);
      return { added: false };
    } else {
      const currentCount = await wishlistRepository.countByUserId(userId);
      if (currentCount >= 50) {
        throw new ValidationError('Limit Reached: អ្នកមិនអាចបន្ថែមទំនិញចូលចំណូលចិត្តលើសពី ៥០ មុខបានទេ (Wishlist full)');
      }
      
      await wishlistRepository.add(userId, productId);
      return { added: true };
    }
  }
};

module.exports = wishlistService;
