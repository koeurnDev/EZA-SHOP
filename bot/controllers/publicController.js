const adminService = require('../services/adminService');
const settingsRepository = require('../repositories/settingsRepository');
const productRepository = require('../repositories/productRepository');
const couponRepository = require('../repositories/couponRepository');
const broadcastRepository = require('../repositories/broadcastRepository');
const cacheService = require('../services/cacheService');
const imageHealthService = require('../services/imageHealthService');
const asyncHandler = require('../utils/asyncHandler');
const { ForbiddenError } = require('../utils/errors');

const parseId = (idParam) => {
  const id = parseInt(idParam, 10);
  if (isNaN(id) || id <= 0) return null;
  return id;
};

const publicController = {
  getInitData: asyncHandler(async (req, res) => {
    const data = await adminService.getInitialData();
    res.json({ success: true, ...data });
  }),

  getSettings: asyncHandler(async (req, res) => {
    const keys = req.query.keys ? req.query.keys.split(',').map(k => k.trim()).filter(Boolean) : null;
    const cacheKey = 'public:settings:' + (keys ? keys.sort().join(',') : 'all');

    const settings = await cacheService.getOrFetch(cacheKey, async () => {
      return keys ? await settingsRepository.getByKeys(keys) : await settingsRepository.getAll();
    }, 300);

    res.json({ success: true, settings });
  }),

  getProducts: asyncHandler(async (req, res) => {
    const result = await productRepository.findWithFilters(req.query);
    res.json({ success: true, ...result });
  }),

  getProductById: asyncHandler(async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) {
      return res.status(400).json({ success: false, error: 'Invalid Product ID' });
    }

    const product = await productRepository.findById(id);
    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }
    res.json({ success: true, product });
  }),

  getAutoDiscounts: asyncHandler(async (req, res) => {
    const discounts = await cacheService.getOrFetch('public:auto_discounts', async () => {
      return await couponRepository.findActiveAuto();
    }, 300);

    res.json({ success: true, discounts });
  }),

  getFlags: asyncHandler(async (req, res) => {
    const flags = await cacheService.getOrFetch('public:feature_flags', async () => ({
      BETA_WISH_LIST: true,
      NEW_CHECKOUT_FLOW: true,
      PREMIUM_ADMIN_STATS: true,
      SEARCH_DEBOUNCE: true
    }), 600);

    res.json({ success: true, data: { flags } });
  }),

  getNotifications: asyncHandler(async (req, res) => {
    const notifications = await cacheService.getOrFetch('public:notifications', async () => {
      return await broadcastRepository.getAll(20);
    }, 300);

    res.json({ success: true, notifications });
  }),

  deleteNotification: asyncHandler(async (req, res) => {
    const authUserId = req.tgUser?.id || req.user?.user_id;
    const superAdminId = Number(process.env.SUPERADMIN_ID);
    const isAdminOrStaff = req.user?.role === 'admin' || req.user?.role === 'staff' || Number(authUserId) === superAdminId;

    if (!isAdminOrStaff) {
      throw new ForbiddenError('Access Denied: Staff/Admin Only');
    }

    const id = parseId(req.params.id);
    if (!id) {
      return res.status(400).json({ success: false, error: 'Invalid Notification ID' });
    }

    await broadcastRepository.delete(id);
    cacheService.delete('public:notifications');
    res.json({ success: true });
  }),

  reportBrokenImage: asyncHandler(async (req, res) => {
    const url = typeof req.body?.url === 'string' ? req.body.url.trim() : '';
    if (!url || !url.includes('cloudinary.com') || url.length > 2048) {
      return res.status(400).json({ success: false, error: 'Invalid image URL' });
    }

    // Client reports only mark cache — never wipe DB (prevents mass image loss)
    const result = await imageHealthService.reportBrokenImage(url, { clearDb: false });
    res.json({ success: true, ...result });
  })
};

module.exports = publicController;
