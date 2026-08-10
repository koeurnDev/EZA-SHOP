const orderRepository = require('../repositories/orderRepository');
const productRepository = require('../repositories/productRepository');
const userRepository = require('../repositories/userRepository');
const settingsRepository = require('../repositories/settingsRepository');
const couponRepository = require('../repositories/couponRepository');

const adminService = {
  getDashboardSummary: async () => {
    const [orderAggregates, customers, productStats] = await Promise.all([
      orderRepository.getDashboardAggregates(),
      userRepository.getCount(),
      productRepository.getInventoryStats()
    ]);

    const stockScore = (productStats.inStock / (productStats.total || 1)) * 40;
    const orderScore = (orderAggregates.healthy / (orderAggregates.total || 1)) * 60;
    const health = Math.round(stockScore + orderScore);

    return {
      totalRevenue: orderAggregates.revenue,
      totalOrders: orderAggregates.totalOrders,
      activeOrders: orderAggregates.activeOrders,
      totalCustomers: customers,
      businessHealth: Math.max(0, Math.min(100, health))
    };
  },

  getAnalytics: async () => {
    const [daily, status] = await Promise.all([
      orderRepository.getDailyStats(14),
      orderRepository.getStatusDistribution()
    ]);
    return { daily, status };
  },

  getInitialData: async () => {
    const { redisClient } = require('../config/redis');
    const cacheKey = 'app:initial_data';

    // ⚡ Redis Smart Cache: Serve from RAM
    if (redisClient && redisClient.isOpen) {
      try {
        const cached = await redisClient.get(cacheKey);
        if (cached) return JSON.parse(cached);
      } catch (e) {
        console.warn('⚠️ Redis Cache Error:', e.message);
      }
    }

    const [products, settings, categories, discounts] = await Promise.all([
      productRepository.findAllMinimal(),
      settingsRepository.getByKeys([
        'shop_status', 'delivery_threshold', 'delivery_fee', 'promo_text', 
        'payment_qr_url', 'payment_info', 'promo_banner_url', 'shop_logo_url'
      ]),
      settingsRepository.getCategories(),
      couponRepository.findActiveAuto()
    ]);

    const result = { products, totalProducts: products.length, settings, categories, discounts };

    // Cache the entire massive object for 60 seconds
    if (redisClient && redisClient.isOpen) {
      redisClient.setEx(cacheKey, 60, JSON.stringify(result)).catch(() => {});
    }

    return result;
  },

  // --- Category Management ---
  getCategories: async () => {
    return await settingsRepository.getCategories();
  },

  addCategory: async (name) => {
    return await settingsRepository.addCategory(name);
  },

  deleteCategory: async (id) => {
    return await settingsRepository.deleteCategory(id);
  },

  // --- Coupon Management ---
  getCoupons: async () => {
    return await couponRepository.findAll();
  },

  addCoupon: async (couponData) => {
    return await couponRepository.create(couponData);
  },

  deleteCoupon: async (id) => {
    return await couponRepository.delete(id);
  },

  // --- User Management ---
  getCustomers: async () => {
    return await userRepository.findAll();
  },

  addLoyaltyPoints: async (userId, points) => {
    return await userRepository.addLoyaltyPoints(userId, points);
  },

  // --- Order Management ---
  getOrders: async () => {
    return await orderRepository.findAll();
  },

  updateOrderStatus: async (orderId, status, trackingNumber) => {
    return await orderRepository.updateStatus(orderId, status, trackingNumber);
  },

  // 🚀 Consolidated Dashboard API: Reduces 6 parallel calls to 1
  getDashboardData: async () => {
    const [summary, analytics, orders, products, categories, settings] = await Promise.all([
      adminService.getDashboardSummary(),
      adminService.getAnalytics(),
      orderRepository.findAll(50), // Limit to 50 recent
      productRepository.findAllMinimal(), // Optimized selective fetch
      settingsRepository.getCategories(),
      settingsRepository.getAll()
    ]);

    return { 
      summary, 
      analytics, 
      orders, 
      products, 
      categories, 
      settings: settings || {} 
    };
  }
};

module.exports = adminService;
