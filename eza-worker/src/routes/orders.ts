import { Hono } from 'hono';
import { eq, desc, sql } from 'drizzle-orm';
import { z } from 'zod';
import { BakongService } from '../services/bakongService';
import { OrderService } from '../services/orderService';
import { createDb } from '../db/connection';
import { orders, settings } from '../db/schema';
import { telegramAuth } from '../middleware/auth';
import { 
  generateOrderCode, 
  calculateDeliveryFee, 
  generateExpiryTime,
  parseJsonSafe,
  validatePhone,
  sanitizeString 
} from '../utils/helpers';
import { sendAdminOrderNotification } from '../utils/telegram';
import type { Env, Variables } from '../types';

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

// Validation schemas
const orderItemSchema = z.object({
  id: z.number(),
  name: z.string(),
  price: z.number().positive(),
  quantity: z.number().int().positive(),
});

const createOrderSchema = z.object({
  items: z.array(orderItemSchema).min(1),
  phone: z.string().min(8),
  address: z.string().min(1),
  province: z.string().min(1),
  note: z.string().optional(),
  delivery_company: z.string().optional().default('J&T Express'),
  payment_method: z.string().default('Bakong KHQR'),
  userName: z.string().optional(),
  redeem_points: z.boolean().optional(),
  coupon_code: z.string().optional(),
  idempotencyKey: z.string().optional(),
});

app.post('/', telegramAuth, async (c) => {
  try {
    const userId = c.get('userId') as string;
    const body = await c.req.json();
    
    const validationResult = createOrderSchema.safeParse(body);
    if (!validationResult.success) {
      return c.json({ success: false, error: 'Invalid request data', details: validationResult.error.issues }, 400);
    }

    const { items, phone, address, province, note, delivery_company, payment_method, userName, coupon_code, idempotencyKey } = validationResult.data;
    const db = createDb(c.env);

    if (idempotencyKey) {
      const existingOrder = await db.select().from(orders).where(eq(orders.idempotency_key, idempotencyKey)).limit(1);
      if (existingOrder.length > 0) {
        const orderData = existingOrder[0];
        return c.json({
          success: true,
          order: {
            id: orderData.id,
            order_code: orderData.order_code,
            total: parseFloat(orderData.gross_total || '0'),
            subtotal: parseFloat(orderData.subtotal || '0'),
            delivery_fee: parseFloat(orderData.delivery_fee || '0'),
            discount_amount: parseFloat(orderData.discount_amount || '0'),
            items: typeof orderData.items === 'string' ? JSON.parse(orderData.items) : orderData.items,
            status: orderData.status,
            expires_at: orderData.expires_at?.toISOString(),
            payment_method: orderData.payment_method,
            user_name: orderData.user_name || 'Guest',
            phone: orderData.phone,
            bakong_qr_string: orderData.qr_string,
          },
          message: 'Idempotent request: Order already exists',
        });
      }
    }

    if (!validatePhone(phone)) {
      return c.json({ success: false, error: 'Invalid phone number format' }, 400);
    }

    if (userId && userId !== c.env.SUPERADMIN_ID) {
      const pendingCountRes = await db.execute(
        sql`SELECT COUNT(*) as count FROM orders WHERE user_id = ${userId} AND status = 'pending'`
      );
      const pendingCount = parseInt((pendingCountRes.rows[0] as any)?.count || '0');
      if (pendingCount >= 3) {
        return c.json({ success: false, error: 'អ្នកមានការកម្ម៉ង់ដែលមិនទាន់ទូទាត់ប្រាក់ចំនួន ៣ រួចហើយ។ សូមបញ្ចប់ការទូទាត់ ឬបោះបង់ការកម្ម៉ង់ចាស់សិនទើបអាចកម្ម៉ង់ថ្មីបាន។' }, 400);
      }
    }

    const stockResult = await OrderService.verifyStockAndCalculateTotals(items, db);
    if (!stockResult.success || !stockResult.validatedItems) {
      return c.json({ success: false, error: stockResult.error }, 400);
    }
    const { subtotal, validatedItems } = stockResult;

    const deliverySettings = await db.select().from(settings);
    const settingsMap = deliverySettings.reduce((acc, s) => { acc[s.key] = s.value; return acc; }, {} as Record<string, string | null>);

    const deliveryFee = parseFloat(settingsMap['delivery_fee'] || '1.50');
    const deliveryThreshold = parseFloat(settingsMap['delivery_threshold'] || '50');
    const provincialDeliveryFee = parseFloat(settingsMap['provincial_delivery_fee'] || '2.50');
    
    const finalDeliveryFee = calculateDeliveryFee(subtotal || 0, deliveryFee, deliveryThreshold, province, provincialDeliveryFee);

    const discountResult = await OrderService.calculateDiscounts(subtotal || 0, userId, coupon_code, db);
    const { discountAmount, targetCouponId } = discountResult;
    
    const grossTotal = Math.max(0, (subtotal || 0) - discountAmount + finalDeliveryFee);

    const transactionResult = await OrderService.executeCompensatingTransaction(validatedItems, targetCouponId, db);
    if (!transactionResult.success) {
      return c.json({ success: false, error: transactionResult.error }, 400);
    }
    const { successfulStockDeductions, couponDeducted } = transactionResult;

    const orderCode = generateOrderCode();
    const expiresAt = generateExpiryTime();
    const qrString = await OrderService.generatePaymentQR(grossTotal, orderCode, expiresAt, c.env, settingsMap);

    let newOrder;
    try {
      newOrder = await db.insert(orders).values({
        user_id: userId,
        user_name: userName || 'Guest',
        items: JSON.stringify(validatedItems),
        total: ((subtotal || 0) + finalDeliveryFee).toString(),
        subtotal: (subtotal || 0).toString(),
        discount_amount: discountAmount.toString(),
        delivery_fee: finalDeliveryFee.toString(),
        gross_total: grossTotal.toString(),
        qr_string: qrString,
        phone: sanitizeString(phone),
        address: sanitizeString(address),
        province: sanitizeString(province),
        note: note ? sanitizeString(note) : null,
        delivery_company: sanitizeString(delivery_company),
        payment_method: sanitizeString(payment_method),
        order_code: orderCode,
        idempotency_key: idempotencyKey || null,
        status: 'pending',
        expires_at: expiresAt,
      }).returning();
    } catch (insertError) {
      console.error('Failed to insert order, rolling back...', insertError);
      await OrderService.rollbackTransaction(successfulStockDeductions || [], couponDeducted || false, targetCouponId, db);
      return c.json({ success: false, error: 'Database error while creating order' }, 500);
    }

    if (payment_method === 'cash' || grossTotal <= 0) {
      c.executionCtx.waitUntil(
        sendAdminOrderNotification(c.env, {
          orderCode,
          userName: userName || 'Guest',
          phone: sanitizeString(phone),
          address: sanitizeString(address),
          province: sanitizeString(province),
          paymentMethod: sanitizeString(payment_method),
          items: validatedItems,
          grossTotal
        }, 'cash')
      );
    }

    return c.json({
      success: true,
      order: {
        id: newOrder[0].id,
        order_code: orderCode,
        total: grossTotal,
        subtotal,
        delivery_fee: finalDeliveryFee,
        discount_amount: discountAmount,
        items: validatedItems,
        status: 'pending',
        expires_at: expiresAt.toISOString(),
        payment_method,
        user_name: userName || 'Guest',
        phone: sanitizeString(phone),
        bakong_qr_string: qrString,
      },
      message: 'Order created successfully',
    });

  } catch (error) {
    console.error('Create order error:', error);
    return c.json({ success: false, error: 'Failed to create order', message: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});

app.get('/', telegramAuth, async (c) => {
  try {
    const userId = c.get('userId') as string;
    const db = createDb(c.env);

    const userOrders = await db.select().from(orders).where(eq(orders.user_id, userId)).orderBy(desc(orders.created_at)).limit(50);

    const formattedOrders = userOrders.map(order => ({
      id: order.id,
      order_code: order.order_code,
      total: parseFloat(order.total),
      subtotal: parseFloat(order.subtotal || '0'),
      delivery_fee: parseFloat(order.delivery_fee || '0'),
      discount_amount: parseFloat(order.discount_amount || '0'),
      items: parseJsonSafe(order.items as string, []),
      status: order.status,
      phone: order.phone,
      address: order.address,
      province: order.province,
      delivery_company: order.delivery_company,
      payment_method: order.payment_method,
      tracking_number: order.tracking_number,
      expires_at: order.expires_at?.toISOString(),
      created_at: order.created_at.toISOString(),
    }));

    return c.json({ success: true, orders: formattedOrders, total: formattedOrders.length });
  } catch (error) {
    console.error('Get orders error:', error);
    return c.json({ success: false, error: 'Failed to fetch orders', message: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});

app.get('/:orderCode', telegramAuth, async (c) => {
  try {
    const userId = c.get('userId') as string;
    const orderCode = c.req.param('orderCode');
    const db = createDb(c.env);

    const order = await db.select().from(orders).where(eq(orders.order_code, orderCode)).limit(1);

    if (order.length === 0) return c.json({ success: false, error: 'Order not found' }, 404);

    const orderData = order[0];
    const isAdmin = c.get('isAdmin') as boolean;
    if (!isAdmin && orderData.user_id !== userId) return c.json({ success: false, error: 'Access denied' }, 403);

    const formattedOrder = {
      id: orderData.id,
      order_code: orderData.order_code,
      total: parseFloat(orderData.total),
      subtotal: parseFloat(orderData.subtotal || '0'),
      delivery_fee: parseFloat(orderData.delivery_fee || '0'),
      discount_amount: parseFloat(orderData.discount_amount || '0'),
      items: parseJsonSafe(orderData.items as string, []),
      status: orderData.status,
      phone: orderData.phone,
      address: orderData.address,
      province: orderData.province,
      note: orderData.note,
      delivery_company: orderData.delivery_company,
      payment_method: orderData.payment_method,
      tracking_number: orderData.tracking_number,
      qr_string: orderData.qr_string,
      expires_at: orderData.expires_at?.toISOString(),
      created_at: orderData.created_at.toISOString(),
    };

    return c.json({ success: true, order: formattedOrder });
  } catch (error) {
    console.error('Get order error:', error);
    return c.json({ success: false, error: 'Failed to fetch order', message: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});

app.post('/:id/verify-payment', telegramAuth, async (c) => {
  try {
    const db = createDb(c.env);
    const orderId = parseInt(c.req.param('id'));

    const [order] = await db.select().from(orders).where(eq(orders.id, orderId));
    if (!order) return c.json({ success: false, error: 'Order not found' }, 404);
    if (!order.qr_string) return c.json({ success: false, error: 'No KHQR string associated with this order' }, 400);
    if (order.status === 'paid') return c.json({ success: true, message: 'Order is already paid' });

    const bakongService = new BakongService(c.env);
    const result = await bakongService.checkTransaction(order.qr_string);

    if (result.success) {
      await db.update(orders).set({ status: 'paid' }).where(eq(orders.id, orderId));
      c.executionCtx.waitUntil(
        sendAdminOrderNotification(c.env, {
          orderCode: order.order_code,
          userName: order.user_name || 'Guest',
          phone: order.phone,
          address: order.address,
          province: order.province,
          paymentMethod: order.payment_method,
          items: typeof order.items === 'string' ? JSON.parse(order.items) : order.items,
          grossTotal: order.gross_total
        }, 'auto_verified')
      );
      return c.json({ success: true, message: 'Payment verified successfully!' });
    } else {
      return c.json({ success: false, error: result.message || 'Payment not found' });
    }
  } catch (error) {
    console.error('Verify payment error:', error);
    return c.json({ success: false, error: 'Failed to verify payment' }, 500);
  }
});

export default app;