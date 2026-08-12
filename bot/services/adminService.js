const orderRepository = require('../repositories/orderRepository');
const productRepository = require('../repositories/productRepository');
const userRepository = require('../repositories/userRepository');
const settingsRepository = require('../repositories/settingsRepository');
const couponRepository = require('../repositories/couponRepository');
const cacheService = require('./cacheService');

const adminService = {
  getDashboardSummary: async () => {
    const [rawOrderAggregates, customersCount, rawProductStats] = await Promise.all([
      orderRepository.getDashboardAggregates().catch(() => null),
      userRepository.getCount().catch(() => 0),
      productRepository.getInventoryStats().catch(() => null)
    ]);

    const orderAggregates = {
      revenue: 0,
      totalOrders: 0,
      activeOrders: 0,
      healthy: 0,
      total: 0,
      ...(rawOrderAggregates || {})
    };

    const productStats = {
      inStock: 0,
      total: 0,
      ...(rawProductStats || {})
    };

    const customers = Number(customersCount) || 0;

    const stockScore = ((productStats.inStock || 0) / (productStats.total || 1)) * 40;
    const orderScore = ((orderAggregates.healthy || 0) / (orderAggregates.total || 1)) * 60;
    const health = Math.round(stockScore + orderScore);

    return {
      totalRevenue: Number(orderAggregates.revenue) || 0,
      totalOrders: Number(orderAggregates.totalOrders) || 0,
      activeOrders: Number(orderAggregates.activeOrders) || 0,
      totalCustomers: customers,
      businessHealth: Math.max(0, Math.min(100, health))
    };
  },

  getAnalytics: async () => {
    const [daily, status] = await Promise.all([
      orderRepository.getDailyStats(14).catch(() => []),
      orderRepository.getStatusDistribution().catch(() => [])
    ]);
    return { daily: daily || [], status: status || [] };
  },

  getInitialData: async () => {
    const imageHealthService = require('./imageHealthService');
    const data = await cacheService.getOrFetch('system:init:data', async () => {
      const [products, settings, categories, discounts] = await Promise.all([
        productRepository.findAllMinimal(),
        settingsRepository.getByKeys([
          'shop_status', 'delivery_threshold', 'delivery_fee', 'promo_text',
          'payment_qr_url', 'payment_info', 'promo_banner_url', 'shop_logo_url',
          'social_fb', 'social_tg', 'social_ig', 'social_tt', 'social_email',
          'shop_phone', 'shop_address', 'shop_hours', 'social_wa', 'receipt_shop_name'
        ]),
        settingsRepository.getCategories(),
        couponRepository.findActiveAuto()
      ]);

      return { products, totalProducts: (products || []).length, settings: settings || {}, categories: categories || [], discounts: discounts || [] };
    }, 300);

    if (data?.products?.length) {
      data.products = await imageHealthService.sanitizeProductImages(data.products);
    }
    return data;
  },

  // --- Category Management ---
  getCategories: async () => {
    return await settingsRepository.getCategories();
  },

  addCategory: async (name) => {
    const res = await settingsRepository.addCategory(name);
    // Invalidate init data cache so clients get updated categories
    cacheService.delete('system:init:data');
    cacheService.delete('app:initial_data');
    cacheService.delete('admin:dashboard_data');
    return res;
  },

  deleteCategory: async (id) => {
    const res = await settingsRepository.deleteCategory(id);
    cacheService.delete('system:init:data');
    cacheService.delete('app:initial_data');
    cacheService.delete('admin:dashboard_data');
    return res;
  },

  // --- Coupon Management ---
  getCoupons: async () => {
    return await couponRepository.findAll();
  },

  addCoupon: async (couponData) => {
    const res = await couponRepository.create(couponData);
    cacheService.delete('system:init:data');
    cacheService.delete('app:initial_data');
    cacheService.delete('admin:dashboard_data');
    return res;
  },

  deleteCoupon: async (id) => {
    const res = await couponRepository.delete(id);
    cacheService.delete('system:init:data');
    cacheService.delete('app:initial_data');
    cacheService.delete('admin:dashboard_data');
    return res;
  },

  // --- User Management ---
  getCustomers: async (limit = 100, offset = 0) => {
    return await userRepository.findAll(limit, offset);
  },

  addLoyaltyPoints: async (userId, points) => {
    return await userRepository.addLoyaltyPoints(userId, points);
  },

  // --- Order Management ---
  getOrders: async (limit = 100, offset = 0) => {
    return await orderRepository.findAll(limit, offset);
  },

  updateOrderStatus: async (orderId, status, trackingNumber) => {
    const updated = await orderRepository.updateStatus(orderId, status, trackingNumber);
    if (updated) {
      cacheService.delete('admin:dashboard_data').catch(() => {});
    }
    return updated;
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
      orders: orders || [], 
      products: products || [], 
      categories: categories || [], 
      settings: settings || {} 
    };
  }
};

module.exports = adminService;
