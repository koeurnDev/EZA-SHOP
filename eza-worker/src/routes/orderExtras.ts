import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { createDb } from '../db/connection';
import { orders, coupons } from '../db/schema';
import { telegramAuth } from '../middleware/auth';
import { parseJsonSafe } from '../utils/helpers';
import { sendAdminOrderNotification } from '../utils/telegram';
import type { Env, Variables } from '../types';

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

import { BakongService } from '../services/bakongService';

/**
 * GET /api/orders/status/:orderCode - Poll order status
 */
app.get('/status/:orderCode', telegramAuth, async (c) => {
  try {
    const userId = c.get('userId');
    const isAdmin = c.get('isAdmin');
    const orderCode = c.req.param('orderCode');
    const db = createDb(c.env);

    const result = await db
      .select()
      .from(orders)
      .where(eq(orders.order_code, orderCode))
      .limit(1);

    if (!result.length) {
      return c.json({ success: false, error: 'Order not found' }, 404);
    }

    let order = result[0];

    // Security: user can only see their own orders
    if (!isAdmin && order.user_id !== userId) {
      return c.json({ success: false, error: 'Access denied' }, 403);
    }

    // ✨ ON-THE-FLY AUTO-CHECK: If the client is polling and it's a pending Bakong order, check it immediately
    if (order.status === 'pending' && order.payment_method === 'Bakong KHQR' && order.qr_string && order.qr_string !== '{}') {
      const bakongService = new BakongService(c.env);
      const bakongResult = await bakongService.checkTransaction(order.qr_string);
      
      if (bakongResult.success) {
        console.log(`[Status API] Payment verified on-the-fly for order ${orderCode}! Updating status...`);
        await db
          .update(orders)
          .set({ status: 'paid' })
          .where(eq(orders.id, order.id));
        
        // Update the local object so the response reflects the new status
        order.status = 'paid';
      }
    }

    return c.json({
      success: true,
      status: order.status,
      order: {
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
        note: order.note,
        delivery_company: order.delivery_company,
        payment_method: order.payment_method,
        tracking_number: order.tracking_number,
        receipt_url: order.receipt_url,
        qr_string: order.qr_string,
        expires_at: order.expires_at?.toISOString(),
        created_at: order.created_at.toISOString(),
      },
    });
  } catch (error) {
    console.error('getOrderStatus error:', error);
    return c.json({ success: false, error: 'Failed to fetch order status' }, 500);
  }
});

/**
 * POST /api/orders/validate-coupon
 */
app.post('/validate-coupon', telegramAuth, async (c) => {
  try {
    const body = await c.req.json();
    const schema = z.object({ code: z.string().min(1) });
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return c.json({ success: false, error: 'Missing coupon code' }, 400);
    }

    const db = createDb(c.env);
    const result = await db
      .select()
      .from(coupons)
      .where(eq(coupons.code, parsed.data.code.toUpperCase().trim()))
      .limit(1);

    if (!result.length || !result[0].active) {
      return c.json({ success: false, error: 'Coupon code is invalid or expired.' }, 404);
    }

    const coupon = result[0];

    // Check dates
    const now = new Date();
    if (coupon.start_date && new Date(coupon.start_date) > now) {
      return c.json({ success: false, error: 'Coupon is not yet active.' }, 400);
    }
    if (coupon.end_date && new Date(coupon.end_date) < now) {
      return c.json({ success: false, error: 'Coupon has expired.' }, 400);
    }
    if (coupon.usage_limit && (coupon.used_count || 0) >= coupon.usage_limit) {
      return c.json({ success: false, error: 'Coupon usage limit reached.' }, 400);
    }

    return c.json({
      success: true,
      coupon: {
        id: coupon.id,
        code: coupon.code,
        discount_type: coupon.discount_type,
        value: parseFloat(coupon.value),
        apply_to: coupon.apply_to,
      },
    });
  } catch (error) {
    console.error('validateCoupon error:', error);
    return c.json({ success: false, error: 'Failed to validate coupon' }, 500);
  }
});

/**
 * POST /api/orders/receipt - Attach receipt URL to an order
 */
app.post('/receipt', telegramAuth, async (c) => {
  try {
    const userId = c.get('userId');
    const body = await c.req.json();

    const schema = z.object({
      orderCode: z.string().min(1),
      receiptUrl: z.string().url(),
    });

    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return c.json({ success: false, error: 'Missing orderCode or receiptUrl' }, 400);
    }

    const db = createDb(c.env);

    const existing = await db
      .select()
      .from(orders)
      .where(eq(orders.order_code, parsed.data.orderCode))
      .limit(1);

    if (!existing.length) {
      return c.json({ success: false, error: 'Order not found' }, 404);
    }
    if (existing[0].user_id !== userId) {
      return c.json({ success: false, error: 'Access denied' }, 403);
    }

    const updated = await db
      .update(orders)
      .set({ receipt_url: parsed.data.receiptUrl })
      .where(eq(orders.order_code, parsed.data.orderCode))
      .returning();

    // Send Telegram Notification to Admin after receipt is uploaded
    c.executionCtx.waitUntil(
      sendAdminOrderNotification(c.env, {
        orderCode: updated[0].order_code,
        userName: updated[0].user_name || 'Guest',
        phone: updated[0].phone,
        address: updated[0].address,
        province: updated[0].province,
        paymentMethod: updated[0].payment_method,
        items: typeof updated[0].items === 'string' ? JSON.parse(updated[0].items) : updated[0].items,
        grossTotal: updated[0].gross_total,
        receiptUrl: updated[0].receipt_url,
        createdAt: updated[0].created_at
      }, 'receipt_uploaded')
    );

    return c.json({ success: true, order: { id: updated[0].id, order_code: updated[0].order_code, status: updated[0].status, receipt_url: updated[0].receipt_url } });
  } catch (error) {
    console.error('uploadReceipt error:', error);
    return c.json({ success: false, error: 'Failed to attach receipt' }, 500);
  }
});

export default app;
