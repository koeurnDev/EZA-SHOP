const wishlistService = require('../services/wishlistService');
const asyncHandler = require('../utils/asyncHandler');
const { ValidationError, UnauthorizedError } = require('../utils/errors');

const wishlistController = {
  get: asyncHandler(async (req, res) => {
    // 🛡️ IDOR Fix: Derive user ID directly from authenticated session
    const authUserId = req.tgUser?.id || req.user?.user_id || req.user?.id;
    if (!authUserId) {
      throw new UnauthorizedError('Authentication Required');
    }

    const superAdminId = Number(process.env.SUPERADMIN_ID);
    const isAdminOrStaff = req.user?.role === 'admin' || req.user?.role === 'staff' || Number(authUserId) === superAdminId;

    // Only allow requesting arbitrary userId if the caller is an Admin/Staff
    const effectiveUserId = (isAdminOrStaff && req.params.userId) ? req.params.userId : authUserId;

    const wishlist = await wishlistService.getWishlist(effectiveUserId, authUserId);
    res.json({ success: true, wishlist: wishlist || [] });
  }),

  toggle: asyncHandler(async (req, res) => {
    // 🛡️ IDOR Fix: Derive user ID directly from authenticated session
    const authUserId = req.tgUser?.id || req.user?.user_id || req.user?.id;
    if (!authUserId) {
      throw new UnauthorizedError('Authentication Required');
    }

    const productId = parseInt(req.body.productId, 10);
    if (isNaN(productId) || productId <= 0) {
      throw new ValidationError('Valid Product ID is required.');
    }

    const result = await wishlistService.toggleWishlist(authUserId, productId, authUserId);
    
    // Structured response metadata for optimistic UI updates
    res.json({ 
      success: true, 
      added: result.added, 
      productId,
      message: result.added ? 'Item added to wishlist' : 'Item removed from wishlist'
    });
  })
};

module.exports = wishlistController;
