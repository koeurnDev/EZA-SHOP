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
    const { userId } = req.query;
    const targetId = userId || req.params.userId;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const offset = parseInt(req.query.offset) || 0;
    
    const { orders, total } = await orderService.getUserOrders(targetId, limit, offset, req.tgUser);
    
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
  })
};

module.exports = orderController;
