const pool = require('../config/database');

const reviewRepository = {
  findByProductId: async (productId) => {
    const res = await pool.query(
      'SELECT id, user_name, rating, comment, created_at FROM reviews WHERE product_id = $1 ORDER BY created_at DESC',
      [productId]
    );
    return res.rows;
  },

  create: async (data) => {
    const res = await pool.query(
      'INSERT INTO reviews (product_id, user_id, user_name, rating, comment) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [data.product_id, data.user_id, data.user_name, data.rating, data.comment]
    );
    return res.rows[0];
  },

  getAverageRating: async (productId) => {
    const res = await pool.query(
      'SELECT ROUND(AVG(rating), 1) as avg_rating, COUNT(*) as review_count FROM reviews WHERE product_id = $1',
      [productId]
    );
    return {
      avg_rating: res.rows[0].avg_rating || 0,
      review_count: parseInt(res.rows[0].review_count, 10) || 0
    };
  }
};

module.exports = reviewRepository;
