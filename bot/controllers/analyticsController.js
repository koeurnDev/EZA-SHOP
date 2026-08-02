const orderRepository = require('../repositories/orderRepository');

const analyticsController = {
  getAdvancedAnalytics: async (req, res) => {
    try {
      const [topProducts, topCustomers, aovData] = await Promise.all([
        orderRepository.getTopSellingProducts(5),
        orderRepository.getTopCustomers(5),
        orderRepository.getAverageOrderValue()
      ]);

      res.json({
        success: true,
        data: {
          topProducts,
          topCustomers,
          aov: aovData
        }
      });
    } catch (err) {
      console.error('🔴 Advanced Analytics Error:', err.message);
      res.status(500).json({ success: false, error: 'Failed to fetch advanced analytics' });
    }
  }
};

module.exports = analyticsController;
