const orderService = require('../services/orderService');
const couponRepository = require('../repositories/couponRepository');
const asyncHandler = require('../utils/asyncHandler');
const { ForbiddenError, NotFoundError, ValidationError } = require('../utils/errors');

const orderController = {
  createOrder: asyncHandler(async (req, res) => {
    const result = await orderService.createOrder(req.body, req.tgUser);
    res.status(201).json({ success: true, ...result });
  }),

  getStatus: asyncHandler(async (req, res) => {
    const order = await orderService.getOrderStatus(req.params.orderCode, req.tgUser);
    res.json({ success: true, status: order.status, order });
  }),

  getUserOrders: asyncHandler(async (req, res) => {
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 100);
    const offset = Math.max(parseInt(req.query.offset) || 0, 0);
    
    // 🛡️ Authorization Security Guard: Only Admins/Staff can query arbitrary userId values via query params.
    // Regular users are strictly locked to their authenticated Telegram / User ID.
    const authUserId = req.tgUser?.id || req.user?.user_id;
    const superAdminId = Number(process.env.SUPERADMIN_ID);
    const isAdminOrStaff = req.user?.role === 'admin' || req.user?.role === 'staff' || Number(authUserId) === superAdminId;

    const effectiveUserId = (isAdminOrStaff && req.query.userId) ? req.query.userId : authUserId;
    
    const { orders, total } = await orderService.getUserOrders(effectiveUserId, limit, offset, req.tgUser);
    
    res.json({ 
      success: true, 
      orders,
      pagination: {
        limit,
        offset,
        total,
        hasMore: offset + limit < total
      }
    });
  }),

  confirmOrder: asyncHandler(async (req, res) => {
    const { orderCode } = req.body;
    if (!orderCode) throw new ValidationError('Order code is required.');
    const order = await orderService.confirmOrderPayment(orderCode, req.tgUser);
    res.json({ success: true, order });
  }),

  uploadReceipt: asyncHandler(async (req, res) => {
    const { orderCode, receiptUrl } = req.body;
    if (!orderCode || !receiptUrl) throw new ValidationError('Missing orderCode or receiptUrl.');
    const order = await orderService.uploadReceipt(orderCode, receiptUrl, req.tgUser);
    res.json({ success: true, order });
  }),

  validateCoupon: asyncHandler(async (req, res) => {
    const { code } = req.body;
    if (!code) throw new ValidationError('Missing coupon code.');
    
    const coupon = await couponRepository.findByCode(code);
    if (!coupon) {
      throw new NotFoundError('Coupon code is invalid or expired.');
    }
    res.json({ success: true, coupon });
  })
};

module.exports = orderController;
