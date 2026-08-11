const pool = require('../config/database');

const reviewRepository = {
  findByProductId: async (productId, limit = 20, offset = 0) => {
    const pId = parseInt(productId, 10);
    if (isNaN(pId)) return [];

    const res = await pool.query(
      'SELECT id, user_name, rating, comment, created_at FROM reviews WHERE product_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
      [pId, limit, offset]
    );
    return res.rows;
  },

  hasUserReviewed: async (userId, productId) => {
    const uId = String(userId);
    const pId = parseInt(productId, 10);
    if (!uId || isNaN(pId)) return false;

    const res = await pool.query(
      'SELECT id FROM reviews WHERE user_id = $1 AND product_id = $2 LIMIT 1',
      [uId, pId]
    );
    return res.rows.length > 0;
  },

  create: async (data) => {
    const res = await pool.query(
      'INSERT INTO reviews (product_id, user_id, user_name, rating, comment) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [data.product_id, String(data.user_id), data.user_name, data.rating, data.comment]
    );
    return res.rows[0];
  },

  getAverageRating: async (productId) => {
    const pId = parseInt(productId, 10);
    if (isNaN(pId)) return { avg_rating: 0, review_count: 0 };

    const res = await pool.query(
      'SELECT ROUND(AVG(rating), 1) as avg_rating, COUNT(*) as review_count FROM reviews WHERE product_id = $1',
      [pId]
    );
    return {
      avg_rating: parseFloat(res.rows[0]?.avg_rating || 0),
      review_count: parseInt(res.rows[0]?.review_count || 0, 10)
    };
  }
};

module.exports = reviewRepository;
