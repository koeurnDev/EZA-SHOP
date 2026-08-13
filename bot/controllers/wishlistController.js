const wishlistService = require('../services/wishlistService');
const asyncHandler = require('../utils/asyncHandler');
const { ValidationError, UnauthorizedError } = require('../utils/errors');

const getAuthUserId = (req) => req.tgUser?.id || req.user?.user_id || req.user?.id;

const wishlistController = {
  get: asyncHandler(async (req, res) => {
    const authUserId = getAuthUserId(req);
    if (!authUserId) {
      throw new UnauthorizedError('Authentication Required');
    }

    const superAdminId = Number(process.env.SUPERADMIN_ID);
    const isAdminOrStaff = req.user?.role === 'admin' || req.user?.role === 'staff' || Number(authUserId) === superAdminId;
    const effectiveUserId = (isAdminOrStaff && req.params.userId) ? req.params.userId : authUserId;

    const wishlist = await wishlistService.getWishlist(effectiveUserId, authUserId);
    res.json({ success: true, wishlist: wishlist || [] });
  }),

  getMine: asyncHandler(async (req, res) => {
    const authUserId = getAuthUserId(req);
    if (!authUserId) {
      throw new UnauthorizedError('Authentication Required');
    }

    const wishlist = await wishlistService.getWishlist(authUserId, authUserId);
    res.json({ success: true, wishlist: wishlist || [] });
  }),

  toggle: asyncHandler(async (req, res) => {
    const authUserId = getAuthUserId(req);
    if (!authUserId) {
      throw new UnauthorizedError('Authentication Required');
    }

    const productId = parseInt(req.body.productId, 10);
    if (isNaN(productId) || productId <= 0) {
      throw new ValidationError('Valid Product ID is required.');
    }

    const result = await wishlistService.toggleWishlist(authUserId, productId, authUserId);

    res.json({
      success: true,
      added: result.added,
      productId,
      message: result.added ? 'Item added to wishlist' : 'Item removed from wishlist'
    });
  })
};

module.exports = wishlistController;
