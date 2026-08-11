const orderRepository = require('../repositories/orderRepository');
const cacheService = require('../services/cacheService');

const analyticsController = {
  getAdvancedAnalytics: async (req, res) => {
    try {
      const limit = Math.min(Math.max(parseInt(req.query.limit) || 5, 1), 50);
      const days = Math.min(Math.max(parseInt(req.query.days) || 30, 1), 365);

      const cacheKey = `admin:advanced_analytics:${limit}:${days}`;

      // ⚡ High-Performance Cache Layer (10 min TTL for expensive aggregate queries)
      const data = await cacheService.getOrFetch(cacheKey, async () => {
        const [topProducts, topCustomers, aovData] = await Promise.all([
          orderRepository.getTopSellingProducts(limit, days),
          orderRepository.getTopCustomers(limit, days),
          orderRepository.getAverageOrderValue(days)
        ]);

        return {
          topProducts: topProducts || [],
          topCustomers: topCustomers || [],
          aov: aovData || { aov: 0, aov_30d: 0 },
          rangeDays: days,
          limit
        };
      }, 600);

      res.json({
        success: true,
        data
      });
    } catch (err) {
      console.error('🔴 Advanced Analytics Error:', err.message);
      res.status(500).json({ success: false, error: 'Failed to fetch advanced analytics' });
    }
  }
};

module.exports = analyticsController;
