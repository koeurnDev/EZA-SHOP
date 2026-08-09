const orderService = require('../services/orderService');
const asyncHandler = require('../utils/asyncHandler');
const { ForbiddenError, NotFoundError } = require('../utils/errors');

const orderController = {
  createOrder: asyncHandler(async (req, res) => {
    const result = await orderService.createOrder(req.body, req.tgUser);
    res.json({ success: true, ...result });
  }),

  getStatus: asyncHandler(async (req, res) => {
    const order = await orderService.getOrderStatus(req.params.orderCode, req.tgUser);
    res.json({ success: true, status: order.status, order });
  }),

  getUserOrders: asyncHandler(async (req, res) => {
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const offset = parseInt(req.query.offset) || 0;
    
    // Use tgUser.id as the canonical userId (from auth middleware)
    const effectiveUserId = req.query.userId || req.tgUser?.id || req.user?.user_id;
    
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
    const order = await orderService.confirmOrderPayment(orderCode, req.tgUser);
    res.json({ success: true, order });
  }),

  uploadReceipt: asyncHandler(async (req, res) => {
    const { orderCode, receiptUrl } = req.body;
    if (!orderCode || !receiptUrl) throw new Error('Missing parameters');
    const order = await orderService.uploadReceipt(orderCode, receiptUrl, req.tgUser);
    res.json({ success: true, order });
  }),

  validateCoupon: asyncHandler(async (req, res) => {
    const { code } = req.body;
    if (!code) throw new Error('Missing coupon code');
    const couponRepository = require('../repositories/couponRepository');
    const coupon = await couponRepository.findByCode(code);
    if (!coupon) {
      throw new NotFoundError('Coupon code is invalid or expired.');
    }
    res.json({ success: true, coupon });
  })
};

module.exports = orderController;
