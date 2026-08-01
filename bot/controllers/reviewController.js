const reviewRepository = require('../repositories/reviewRepository');

const reviewController = {
  getReviewsByProduct: async (req, res) => {
    try {
      const { productId } = req.params;
      const reviews = await reviewRepository.findByProductId(productId);
      const stats = await reviewRepository.getAverageRating(productId);
      
      res.json({ success: true, reviews, stats });
    } catch (err) {
      console.error('🔴 Get Reviews Error:', err.message);
      res.status(500).json({ success: false, error: 'Failed to fetch reviews' });
    }
  },

  createReview: async (req, res) => {
    try {
      const { product_id, rating, comment } = req.body;
      const user = req.user; // from verifyUser middleware
      
      if (!product_id || !rating) {
        return res.status(400).json({ success: false, error: 'Product ID and Rating are required' });
      }

      if (rating < 1 || rating > 5) {
        return res.status(400).json({ success: false, error: 'Rating must be between 1 and 5' });
      }

      const reviewData = {
        product_id,
        user_id: user.id.toString(),
        user_name: user.first_name || 'Anonymous',
        rating,
        comment: comment || ''
      };

      const newReview = await reviewRepository.create(reviewData);
      const newStats = await reviewRepository.getAverageRating(product_id);
      
      res.json({ success: true, review: newReview, stats: newStats });
    } catch (err) {
      console.error('🔴 Create Review Error:', err.message);
      res.status(500).json({ success: false, error: 'Failed to submit review' });
    }
  }
};

module.exports = reviewController;
