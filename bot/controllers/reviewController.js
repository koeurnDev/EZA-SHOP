const reviewRepository = require('../repositories/reviewRepository');
const orderRepository = require('../repositories/orderRepository');

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

      // 🛡️ Security Check: Prevent review bombing
      const hasPurchased = await orderRepository.hasPurchasedProduct(user.id, product_id);
      if (!hasPurchased) {
        return res.status(403).json({ 
          success: false, 
          error: 'អ្នកអាចវាយតម្លៃបាន លុះត្រាតែអ្នកធ្លាប់បានទិញ និងទទួលបានទំនិញនេះ។ (You must purchase and receive this product before reviewing.)' 
        });
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
