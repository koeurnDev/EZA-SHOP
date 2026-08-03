const adminService = require('../services/adminService');
const settingsRepository = require('../repositories/settingsRepository');
const productRepository = require('../repositories/productRepository');
const couponRepository = require('../repositories/couponRepository');
const asyncHandler = require('../utils/asyncHandler');

const publicController = {
  getInitData: asyncHandler(async (req, res) => {
    const data = await adminService.getInitialData();
    res.json({ success: true, ...data });
  }),

  bootstrap: asyncHandler(async (req, res) => {
    const { initData } = req.body;
    const data = await adminService.bootstrap(initData);
    res.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
    res.json({ success: true, ...data });
  }),

  getSettings: asyncHandler(async (req, res) => {
    const keys = req.query.keys ? req.query.keys.split(',') : null;
    const settings = keys 
      ? await settingsRepository.getByKeys(keys)
      : await settingsRepository.getAll();
    res.json({ success: true, settings });
  }),

  getProducts: asyncHandler(async (req, res) => {
    const result = await productRepository.findWithFilters(req.query);
    res.json({ success: true, ...result });
  }),

  getProductById: asyncHandler(async (req, res) => {
    const product = await productRepository.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }
    res.json({ success: true, product });
  }),

  getAutoDiscounts: asyncHandler(async (req, res) => {
    const discounts = await couponRepository.findActiveAuto();
    res.json({ success: true, discounts });
  }),

  getFlags: asyncHandler(async (req, res) => {
    // 🚀 Feature Flags: Can be moved to DB settings later for dynamic control
    const flags = {
      BETA_WISH_LIST: true,
      NEW_CHECKOUT_FLOW: true,
      PREMIUM_ADMIN_STATS: true,
      SEARCH_DEBOUNCE: true
    };
    res.json({ success: true, data: { flags } });
  })
};

module.exports = publicController;
