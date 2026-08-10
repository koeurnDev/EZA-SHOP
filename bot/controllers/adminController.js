const adminService = require('../services/adminService');
const cacheService = require('../services/cacheService');
const productRepository = require('../repositories/productRepository');
const settingsRepository = require('../repositories/settingsRepository');
const couponRepository = require('../repositories/couponRepository');
const uploadService = require('../services/uploadService');

const adminController = {
  getSummary: async (req, res) => {
    try {
      const summary = await adminService.getDashboardSummary();
      res.json({ success: true, ...summary });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  },

  getDashboardData: async (req, res) => {
    try {
      const data = await cacheService.getOrFetch(
        'admin:dashboard_data',
        async () => await adminService.getDashboardData(),
        30 // 30 seconds cache for real-time feel without crushing the DB
      );
      res.json({ success: true, ...data });
    } catch (err) {
      console.error('🔴 Admin Batch Data Error:', err.message);
      res.status(500).json({ success: false, error: err.message });
    }
  },

  getAnalytics: async (req, res) => {
    try {
      const stats = await adminService.getAnalytics();
      res.json({ success: true, ...stats });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  },

  // --- Product Management ---
  getProducts: async (req, res) => {
    try {
      const products = await productRepository.findAll();
      res.json({ success: true, products });
    } catch (err) {
      console.error('🔴 Admin Products Error:', err.message);
      res.status(500).json({ success: false, error: err.message });
    }
  },

  createProduct: async (req, res) => {
    try {
      if (req.body.category) {
        await require('../services/adminService').addCategory(req.body.category);
      }
      const product = await productRepository.create(req.body);
      res.json({ success: true, product });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  },

  updateProduct: async (req, res) => {
    try {
      if (req.body.category) {
        await require('../services/adminService').addCategory(req.body.category);
      }

      // Fetch old product for asset cleanup comparison
      const oldProduct = await productRepository.findById(req.params.id);

      const updated = await productRepository.update(req.params.id, req.body);
      if (!updated) return res.status(404).json({ success: false, error: 'Product not found' });

      // 🧹 Non-blocking Cloudinary Cleanup for replaced/removed assets
      if (oldProduct) {
        (async () => {
          try {
            if (oldProduct.image && oldProduct.image !== updated.image) {
              uploadService.deleteImageByUrl(oldProduct.image);
            }
            if (oldProduct.video_url && oldProduct.video_url !== updated.video_url) {
              uploadService.deleteImageByUrl(oldProduct.video_url);
            }
            const oldAdd = typeof oldProduct.additional_images === 'string' ? JSON.parse(oldProduct.additional_images) : (oldProduct.additional_images || []);
            const newAdd = typeof updated.additional_images === 'string' ? JSON.parse(updated.additional_images) : (updated.additional_images || []);
            const removedImages = oldAdd.filter(img => !newAdd.includes(img));
            removedImages.forEach(imgUrl => uploadService.deleteImageByUrl(imgUrl));
          } catch (cleanErr) {
            console.warn('⚠️ Cloudinary Update Cleanup Warning:', cleanErr.message);
          }
        })();
      }

      res.json({ success: true, product: updated });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  },

  deleteProduct: async (req, res) => {
    try {
      const deleted = await productRepository.delete(req.params.id);
      if (!deleted) return res.status(404).json({ success: false, error: 'Product not found' });

      // 🧹 Non-blocking Cloudinary Asset Cleanup to save storage
      (async () => {
        try {
          if (deleted.image) uploadService.deleteImageByUrl(deleted.image);
          if (deleted.video_url) uploadService.deleteImageByUrl(deleted.video_url);
          if (deleted.additional_images) {
            const addImages = typeof deleted.additional_images === 'string'
              ? JSON.parse(deleted.additional_images)
              : (deleted.additional_images || []);
            addImages.forEach(imgUrl => uploadService.deleteImageByUrl(imgUrl));
          }
        } catch (cleanErr) {
          console.warn('⚠️ Cloudinary Cleanup Background Warning:', cleanErr.message);
        }
      })();

      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  },

  // --- Settings & Categories ---
  getSettings: async (req, res) => {
    try {
      const settings = await settingsRepository.getAll();
      res.json({ success: true, settings });
    } catch (err) {
      console.error('🔴 Admin Settings Error:', err.message);
      res.status(500).json({ success: false, error: err.message });
    }
  },

  updateSetting: async (req, res) => {
    try {
      const { key, value } = req.body;
      await settingsRepository.update(key, value);
      res.json({ success: true });
    } catch (err) {
      console.error('🔴 Admin Update Setting Error:', err.message);
      res.status(500).json({ success: false, error: err.message });
    }
  },

  getCategories: async (req, res) => {
    try {
      const categories = await adminService.getCategories();
      res.json({ success: true, categories });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  },

  addCategory: async (req, res) => {
    try {
      const category = await adminService.addCategory(req.body.name);
      res.json({ success: true, category });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  },

  deleteCategory: async (req, res) => {
    try {
      await adminService.deleteCategory(req.params.id);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  },

  // --- Coupon Management ---
  getCoupons: async (req, res) => {
    try {
      const coupons = await adminService.getCoupons();
      res.json({ success: true, coupons });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  },

  addCoupon: async (req, res) => {
    try {
      const coupon = await adminService.addCoupon(req.body);
      res.json({ success: true, coupon });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  },

  deleteCoupon: async (req, res) => {
    try {
      await adminService.deleteCoupon(req.params.id);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  },

  // --- User Management ---
  getCustomers: async (req, res) => {
    try {
      const customers = await adminService.getCustomers();
      res.json({ success: true, customers });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  },

  addLoyaltyPoints: async (req, res) => {
    try {
      const user = await adminService.addLoyaltyPoints(req.body.userId, req.body.points);
      res.json({ success: true, user });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  },

  // --- Order Management ---
  getOrders: async (req, res) => {
    try {
      const orders = await adminService.getOrders();
      res.json({ success: true, orders });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  },

  updateOrderStatus: async (req, res) => {
    try {
      const updated = await adminService.updateOrderStatus(req.body.orderId, req.body.status, req.body.trackingNumber);
      
      // 🚀 Feature 1: Telegram Bot Notifications
      try {
        const bot = require('../config/telegram');
        const statusMap = {
          'paid': 'បានបង់ប្រាក់រូចរាល់ ✅',
          'processing': 'កំពុងរៀបចំ 📦',
          'shipped': 'កំពុងដឹកជញ្ជូន 🚚'
        };
        const statusText = statusMap[updated.status] || updated.status;
        let msg = `សួស្តីបង! ការកម្ម៉ង់របស់បងលេខ #${(updated.order_code || updated.id).toString().substring(0,8)} ត្រូវបានប្តូរស្ថានភាពទៅជា៖ *${statusText}*`;
        if (req.body.trackingNumber) {
          msg += `\nលេខ Tracking របស់បងគឺ៖ \`${req.body.trackingNumber}\``;
        }
        try {
          await bot.telegram.sendMessage(String(updated.user_id), msg, { parse_mode: 'Markdown' });
          console.log(`✅ Telegram order status sent to user ${updated.user_id} for order ${updated.order_code}`);
        } catch (tgErr) {
          console.warn(`⚠️ Telegram order status failed for user ${updated.user_id} order ${updated.order_code}:`, tgErr.message);
        }
      } catch (tgErr) {
        console.warn('⚠️ Could not send telegram notification:', tgErr.message);
      }
      res.json({ success: true, order: updated });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  },

  // --- Upload ---
  upload: async (req, res) => {
    try {
      const url = await uploadService.uploadImage(req.file);
      res.json({ success: true, url });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  },

  deleteFile: async (req, res) => {
    try {
      const { url } = req.body;
      if (url) await uploadService.deleteImageByUrl(url);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  },

  // --- Broadcast ---
  broadcast: async (req, res) => {
    try {
      const { message, photoUrl } = req.body;
      if (!message && !photoUrl) return res.status(400).json({ success: false, message: 'Content missing' });

      const userRepository = require('../repositories/userRepository');
      const broadcastRepository = require('../repositories/broadcastRepository');
      const userIds = await userRepository.getAllIds();

      // Save broadcast in database for in-app NotificationsModal
      await broadcastRepository.create(message, photoUrl);

      // Return response immediately for non-blocking UI
      res.json({ success: true, count: userIds.length });

      // Run in background
      (async () => {
        const bot = require('../config/telegram');
        console.log(`📣 [Broadcast] Starting for ${userIds.length} users...`);
        for (const uid of userIds) {
          if (!uid) continue;
          try {
            if (photoUrl) {
              await bot.telegram.sendPhoto(uid, photoUrl, { caption: message, parse_mode: 'Markdown' });
            } else {
              await bot.telegram.sendMessage(uid, message, { parse_mode: 'Markdown' });
            }
          } catch (e) {
            console.warn(`⚠️ [Broadcast] Skip ${uid}: ${e.message}`);
          }
          await new Promise(r => setTimeout(r, 100)); // Rate limit 10/sec
        }
        console.log(`✅ [Broadcast] Finished.`);
      })();

    } catch (err) {
      console.error('Broadcast Fail:', err);
      if (!res.headersSent) res.status(500).json({ success: false });
    }
  }
};

module.exports = adminController;
