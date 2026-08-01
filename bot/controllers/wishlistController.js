const wishlistService = require('../services/wishlistService');
const asyncHandler = require('../utils/asyncHandler');

const wishlistController = {
  get: asyncHandler(async (req, res) => {
    const wishlist = await wishlistService.getWishlist(req.params.userId, req.tgUser.id);
    res.json({ success: true, wishlist });
  }),

  toggle: asyncHandler(async (req, res) => {
    const { userId, productId } = req.body;
    const result = await wishlistService.toggleWishlist(userId, productId, req.tgUser.id);
    res.json({ success: true, ...result });
  })
};

module.exports = wishlistController;
