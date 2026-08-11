const reviewRepository = require('../repositories/reviewRepository');
const orderRepository = require('../repositories/orderRepository');
const cacheService = require('../services/cacheService');

const reviewController = {
  getReviewsByProduct: async (req, res) => {
    try {
      const productId = parseInt(req.params.productId, 10);
      if (isNaN(productId) || productId <= 0) {
        return res.status(400).json({ success: false, error: 'Invalid Product ID' });
      }

      const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 100);
      const offset = Math.max(parseInt(req.query.offset) || 0, 0);

      const cacheKey = `reviews:product:${productId}:${limit}:${offset}`;

      const data = await cacheService.getOrFetch(cacheKey, async () => {
        const [reviews, stats] = await Promise.all([
          reviewRepository.findByProductId(productId, limit, offset),
          reviewRepository.getAverageRating(productId)
        ]);
        return { reviews, stats };
      }, 300);
      
      res.json({ success: true, ...data });
    } catch (err) {
      console.error('🔴 Get Reviews Error:', err.message);
      res.status(500).json({ success: false, error: 'Failed to fetch reviews' });
    }
  },

  createReview: async (req, res) => {
    try {
      const { product_id, rating, comment } = req.body;
      
      // 🛡️ Ambiguity Fix: Safely resolve user ID across JWT or Telegram session objects
      const userId = req.user?.user_id || req.user?.id || req.tgUser?.id;
      if (!userId) {
        return res.status(401).json({ success: false, error: 'Authentication Required' });
      }

      const pId = parseInt(product_id, 10);
      if (isNaN(pId) || pId <= 0 || !rating) {
        return res.status(400).json({ success: false, error: 'Valid Product ID and Rating are required' });
      }

      const numRating = parseInt(rating, 10);
      if (isNaN(numRating) || numRating < 1 || numRating > 5) {
        return res.status(400).json({ success: false, error: 'Rating must be an integer between 1 and 5' });
      }

      // 🛡️ Duplicate Review Guard (Idempotency)
      const alreadyReviewed = await reviewRepository.hasUserReviewed(userId, pId);
      if (alreadyReviewed) {
        return res.status(400).json({ 
          success: false, 
          error: 'អ្នកបានវាយតម្លៃទំនិញនេះរួចហើយ។ (You have already reviewed this product.)' 
        });
      }

      // 🛡️ Security Check: Prevent review bombing (Verified purchaser check)
      const hasPurchased = await orderRepository.hasPurchasedProduct(userId, pId);
      if (!hasPurchased) {
        return res.status(403).json({ 
          success: false, 
          error: 'អ្នកអាចវាយតម្លៃបាន លុះត្រាតែអ្នកធ្លាប់បានទិញ និងទទួលបានទំនិញនេះ។ (You must purchase and receive this product before reviewing.)' 
        });
      }

      const userName = req.user?.first_name || req.tgUser?.first_name || req.user?.username || 'Customer';

      const reviewData = {
        product_id: pId,
        user_id: userId,
        user_name: userName,
        rating: numRating,
        comment: comment ? String(comment).trim() : ''
      };

      const newReview = await reviewRepository.create(reviewData);
      const newStats = await reviewRepository.getAverageRating(pId);
      
      // 🚀 Invalidate reviews cache on new submission
      cacheService.clearPattern(`reviews:product:${pId}:*`).catch(() => {});

      res.json({ success: true, review: newReview, stats: newStats });
    } catch (err) {
      console.error('🔴 Create Review Error:', err.message);
      res.status(500).json({ success: false, error: 'Failed to submit review' });
    }
  }
};

module.exports = reviewController;
