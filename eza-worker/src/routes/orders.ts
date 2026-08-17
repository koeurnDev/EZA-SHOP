import { Hono } from 'hono';
import { eq, desc, inArray, sql, and } from 'drizzle-orm';
import { z } from 'zod';
// @ts-ignore
import { BakongKHQR, IndividualInfo, khqrData } from 'bakong-khqr';
import { BakongService } from '../services/bakongService';
import { createDb } from '../db/connection';
import { orders, products, settings, users } from '../db/schema';
import { telegramAuth } from '../middleware/auth';
import { 
  generateOrderCode, 
  calculateDeliveryFee, 
  generateExpiryTime,
  getEffectivePrice,
  parseJsonSafe,
  validatePhone,
  sanitizeString 
} from '../utils/helpers';
import type { Env, OrderItem, Variables } from '../types';

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
  address: z.string().min(2),
  province: z.string().min(2),
  note: z.string().optional(),
  delivery_company: z.string(),
  payment_method: z.string().default('Bakong KHQR'),
  userName: z.string().optional(),
  redeem_points: z.boolean().optional(),
  coupon_code: z.string().optional(),
});

/**
 * POST /api/orders - Create new order
 */
app.post('/', telegramAuth, async (c) => {
  try {
    const userId = c.get('userId') as string;
    const body = await c.req.json();
    
    // Validate request body
    const validationResult = createOrderSchema.safeParse(body);
    if (!validationResult.success) {
      return c.json({ 
        success: false, 
        error: 'Invalid request data',
        details: validationResult.error.issues
      }, 400);
    }

    const { items, phone, address, province, note, delivery_company, payment_method, userName, redeem_points, coupon_code } = validationResult.data;

    // Validate phone
    if (!validatePhone(phone)) {
      return c.json({ success: false, error: 'Invalid phone number format' }, 400);
    }

    const db = createDb(c.env);

    // Prevent Order Spam / Inventory Blocking
    if (userId && userId !== c.env.SUPERADMIN_ID) {
      const pendingCountRes = await db.execute(
        sql`SELECT COUNT(*) as count FROM orders WHERE user_id = ${userId} AND status = 'pending'`
      );
      const pendingCount = parseInt((pendingCountRes.rows[0] as any)?.count || '0');
      if (pendingCount >= 3) {
        return c.json({ success: false, error: 'អ្នកមានការកម្ម៉ង់ដែលមិនទាន់ទូទាត់ប្រាក់ចំនួន ៣ រួចហើយ។ សូមបញ្ចប់ការទូទាត់ ឬបោះបង់ការកម្ម៉ង់ចាស់សិនទើបអាចកម្ម៉ង់ថ្មីបាន។ (Too many pending orders)' }, 400);
      }
    }

    // Verify products and stock
    const productIds = items.map(item => item.id);
    const dbProducts = await db
      .select()
      .from(products)
      .where(inArray(products.id, productIds));

    const productMap = new Map(dbProducts.map(p => [p.id, p]));
    
    // Aggregate quantities by product ID to prevent stock bypass via duplicate items
    const aggregatedItems = new Map<number, number>();
    for (const item of items) {
      aggregatedItems.set(item.id, (aggregatedItems.get(item.id) || 0) + item.quantity);
    }

    // Validate each item's total requested quantity against stock
    for (const [id, totalQuantity] of aggregatedItems.entries()) {
      const dbProduct = productMap.get(id);
      if (!dbProduct) {
        return c.json({ success: false, error: `Product ${id} not found` }, 400);
      }
      if (dbProduct.stock < totalQuantity) {
        return c.json({ 
          success: false, 
          error: `Insufficient stock for ${dbProduct.name}. Available: ${dbProduct.stock}, Requested: ${totalQuantity}` 
        }, 400);
      }
    }

    // Calculate totals
    let subtotal = 0;
    const validatedItems: OrderItem[] = [];

    for (const [id, totalQuantity] of aggregatedItems.entries()) {
      const dbProduct = productMap.get(id);
      if (dbProduct) {
        const effectivePrice = getEffectivePrice(
          parseFloat(dbProduct.price),
          dbProduct.flash_sale_price ? parseFloat(dbProduct.flash_sale_price) : undefined,
          dbProduct.flash_sale_end?.toISOString()
        );
        
        const itemTotal = effectivePrice * totalQuantity;
        subtotal += itemTotal;

        validatedItems.push({
          id: id,
          name: dbProduct.name,
          price: effectivePrice,
          quantity: totalQuantity,
          image: dbProduct.image || undefined,
        });
      }
    }

    const deliverySettings = await db
      .select()
      .from(settings)
      .where(inArray(settings.key, ['delivery_fee', 'delivery_threshold', 'provincial_delivery_fee']));
    
    const settingsMap = deliverySettings.reduce((acc, s) => {
      acc[s.key] = s.value;
      return acc;
    }, {} as Record<string, string | null>);

    const deliveryFee = parseFloat(settingsMap['delivery_fee'] || '1.50');
    const deliveryThreshold = parseFloat(settingsMap['delivery_threshold'] || '50');
    const provincialDeliveryFee = parseFloat(settingsMap['provincial_delivery_fee'] || '2.50');
    
    const finalDeliveryFee = calculateDeliveryFee(subtotal, deliveryFee, deliveryThreshold, province, provincialDeliveryFee);
    let discountAmount = 0;
    
    // --- Pre-calculate Coupon Redemption Logic ---
    let targetCouponId: number | null = null;
    if (coupon_code) {
      const { coupons } = await import('../db/schema');
      const couponResult = await db.select().from(coupons).where(eq(coupons.code, coupon_code.toUpperCase().trim())).limit(1);
      if (couponResult.length > 0 && couponResult[0].active) {
        const coupon = couponResult[0];
        const now = new Date();
        const isActive = (!coupon.start_date || new Date(coupon.start_date) <= now) &&
                         (!coupon.end_date || new Date(coupon.end_date) >= now) &&
                         (!coupon.usage_limit || (coupon.used_count || 0) < coupon.usage_limit);
        
        if (isActive) {
          let cpnDiscount = 0;
          const couponVal = parseFloat(coupon.value);
          if (coupon.discount_type === 'percent') {
            cpnDiscount = subtotal * (couponVal / 100);
          } else if (coupon.discount_type === 'fixed') {
            cpnDiscount = couponVal;
          }
          
          discountAmount += cpnDiscount;
          if (discountAmount > subtotal) discountAmount = subtotal;
          
          targetCouponId = coupon.id;
        }
      }
    }
    
    const grossTotalWithoutVIP = Math.max(0, subtotal - discountAmount);

    // --- Calculate VIP Discount ---
    let vipDiscount = 0;
    if (userId) {
      const spentRes = await db.execute(
        sql`SELECT SUM(total) as total_spent FROM orders WHERE user_id = ${userId} AND status = 'delivered'`
      );
      const totalSpentStr = (spentRes.rows[0] as any)?.total_spent;
      const totalSpent = totalSpentStr ? parseFloat(totalSpentStr) : 0;
      
      let vipDiscountRate = 0;
      if (totalSpent >= 1000) vipDiscountRate = 0.15;
      else if (totalSpent >= 500) vipDiscountRate = 0.10;
      else if (totalSpent >= 100) vipDiscountRate = 0.05;

      vipDiscount = grossTotalWithoutVIP * vipDiscountRate;
      discountAmount += vipDiscount;
    }

    const grossTotal = Math.max(0, subtotal - discountAmount + finalDeliveryFee);

    // --- ATOMIC MUTATIONS WITH ROLLBACK (Compensating Transactions) ---
    let rolledBack = false;

    // 1. Deduct Coupon Atomically
    let couponDeducted = false;
    if (targetCouponId) {
      const { coupons } = await import('../db/schema');
      const updatedCoupon = await db
        .update(coupons)
        .set({ used_count: sql`COALESCE(used_count, 0) + 1` })
        .where(and(
          eq(coupons.id, targetCouponId),
          sql`usage_limit IS NULL OR COALESCE(used_count, 0) < usage_limit`
        ))
        .returning();
      if (updatedCoupon.length === 0) {
        rolledBack = true;
      } else {
        couponDeducted = true;
      }
    }

    // 3. Deduct Stock Atomically
    let stockError = '';
    const successfulStockDeductions: { id: number, qty: number }[] = [];
    
    if (!rolledBack) {
      for (const item of validatedItems) {
        const updatedStock = await db.update(products)
          .set({ stock: sql`stock - ${item.quantity}` })
          .where(and(eq(products.id, item.id), sql`stock >= ${item.quantity}`))
          .returning();
          
        if (updatedStock.length === 0) {
          stockError = `Insufficient stock for ${item.name} or item modified concurrently.`;
          rolledBack = true;
          break;
        }
        successfulStockDeductions.push({ id: item.id, qty: item.quantity });
      }
    }

    // --- ROLLBACK LOGIC ---
    if (rolledBack) {
      // Rollback stock
      for (const rollbackItem of successfulStockDeductions) {
        await db.update(products)
          .set({ stock: sql`stock + ${rollbackItem.qty}` })
          .where(eq(products.id, rollbackItem.id));
      }
      // Rollback coupon
      if (couponDeducted && targetCouponId) {
        const { coupons } = await import('../db/schema');
        await db.update(coupons)
          .set({ used_count: sql`COALESCE(used_count, 0) - 1` })
          .where(eq(coupons.id, targetCouponId));
      }
      return c.json({ success: false, error: stockError || 'Transaction failed due to concurrent modification' }, 400);
    }

    // Generate order code and expiry
    const orderCode = generateOrderCode();
    const expiresAt = generateExpiryTime();

    // Generate KHQR String
    let qrString = '';
    const allSettings = await db.select().from(settings);
    const dbSettings = allSettings.reduce((acc, s) => { acc[s.key] = s.value || ''; return acc; }, {} as Record<string, string>);
    
    const bakongId = c.env.BAKONG_ACCOUNT_ID || dbSettings.bakong_account_id;
    const merchantName = c.env.BAKONG_MERCHANT_NAME || dbSettings.bakong_merchant_name;
    
    if (bakongId && bakongId.trim() !== '') {
      try {
        const khqr = new BakongKHQR();
        const optionalData = {
          amount: parseFloat(grossTotal.toFixed(2)),
          currency: khqrData.currency.usd,
          billNumber: orderCode,
          expirationTimestamp: expiresAt.getTime(),
          merchantCategoryCode: '5999'
        };
        const individualInfo = new IndividualInfo(
          bakongId,
          merchantName || 'Vibe Lifestyle',
          'Phnom Penh',
          optionalData
        );
        const result = khqr.generateIndividual(individualInfo);
        if (result?.data && result.status.code === 0) {
          qrString = result.data.qr;
        }
      } catch (e) {
        console.error('KHQR Gen Error:', e);
      }
    }

    // 4. Create order
    let newOrder;
    try {
      newOrder = await db.insert(orders).values({
        user_id: userId,
        user_name: userName || 'Guest',
        items: JSON.stringify(validatedItems),
        total: (subtotal + finalDeliveryFee).toString(),
        subtotal: subtotal.toString(),
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
        status: 'pending',
        expires_at: expiresAt,
      }).returning();
    } catch (insertError) {
      console.error('Failed to insert order, rolling back...', insertError);
      // Hard rollback if DB insert fails
      for (const rollbackItem of successfulStockDeductions) {
        await db.update(products).set({ stock: sql`stock + ${rollbackItem.qty}` }).where(eq(products.id, rollbackItem.id));
      }
      if (couponDeducted && targetCouponId) {
        const { coupons } = await import('../db/schema');
        await db.update(coupons).set({ used_count: sql`COALESCE(used_count, 0) - 1` }).where(eq(coupons.id, targetCouponId));
      }
      return c.json({ success: false, error: 'Database error while creating order' }, 500);
    }

    // Send Telegram Notification to Admin
    if (c.env.BOT_TOKEN && c.env.SUPERADMIN_ID) {
      try {
        const adminMessage = `🔔 <b>មានការបញ្ជាទិញថ្មី! (New Order)</b>\n\n` +
          `📦 <b>លេខកូដ៖</b> #${orderCode}\n` +
          `👤 <b>ឈ្មោះ៖</b> ${userName || 'Guest'}\n` +
          `📞 <b>លេខទូរស័ព្ទ៖</b> ${sanitizeString(phone)}\n` +
          `📍 <b>ទីតាំង៖</b> ${sanitizeString(address)}, ${sanitizeString(province)}\n` +
          `💳 <b>បង់ប្រាក់៖</b> ${sanitizeString(payment_method)}\n\n` +
          `🛒 <b>ទំនិញ៖</b>\n` +
          validatedItems.map(item => `- ${item.name} x${item.quantity} ($${(item.price * item.quantity).toFixed(2)})`).join('\n') +
          `\n\n💰 <b>សរុប (Total)៖ $${grossTotal.toFixed(2)}</b>`;

        // Send asynchronously to avoid blocking the response
        fetch(`https://api.telegram.org/bot${c.env.BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: c.env.SUPERADMIN_ID,
            text: adminMessage,
            parse_mode: 'HTML'
          })
        }).catch(err => console.error('Telegram notification fetch error:', err));
      } catch (err) {
        console.error('Failed to prepare Telegram notification:', err);
      }
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
    return c.json({ 
      success: false, 
      error: 'Failed to create order',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

/**
 * GET /api/orders - Get user's orders
 */
app.get('/', telegramAuth, async (c) => {
  try {
    const userId = c.get('userId') as string;
    const db = createDb(c.env);

    const userOrders = await db
      .select()
      .from(orders)
      .where(eq(orders.user_id, userId))
      .orderBy(desc(orders.created_at))
      .limit(50);

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

    return c.json({
      success: true,
      orders: formattedOrders,
      total: formattedOrders.length,
    });
  } catch (error) {
    console.error('Get orders error:', error);
    return c.json({ 
      success: false, 
      error: 'Failed to fetch orders',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

/**
 * GET /api/orders/:orderCode - Get order by code
 */
app.get('/:orderCode', telegramAuth, async (c) => {
  try {
    const userId = c.get('userId') as string;
    const orderCode = c.req.param('orderCode');
    const db = createDb(c.env);

    const order = await db
      .select()
      .from(orders)
      .where(eq(orders.order_code, orderCode))
      .limit(1);

    if (order.length === 0) {
      return c.json({ success: false, error: 'Order not found' }, 404);
    }

    const orderData = order[0];

    // Check if user owns this order (unless admin)
    const isAdmin = c.get('isAdmin') as boolean;
    if (!isAdmin && orderData.user_id !== userId) {
      return c.json({ success: false, error: 'Access denied' }, 403);
    }

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

    return c.json({
      success: true,
      order: formattedOrder,
    });
  } catch (error) {
    console.error('Get order error:', error);
    return c.json({ 
      success: false, 
      error: 'Failed to fetch order',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

/**
 * POST /api/orders/:id/verify-payment
 * Trigger a Bakong Auto-check using the MD5 of the generated QR string.
 */
app.post('/:id/verify-payment', telegramAuth, async (c) => {
  try {
    const db = createDb(c.env);
    const orderId = parseInt(c.req.param('id'));

    const [order] = await db.select().from(orders).where(eq(orders.id, orderId));
    if (!order) {
      return c.json({ success: false, error: 'Order not found' }, 404);
    }

    if (!order.qr_string) {
      return c.json({ success: false, error: 'No KHQR string associated with this order' }, 400);
    }
    
    if (order.status === 'paid') {
      return c.json({ success: true, message: 'Order is already paid' });
    }

    const bakongService = new BakongService(c.env);
    const result = await bakongService.checkTransaction(order.qr_string);

    if (result.success) {
      // Mark as paid
      await db.update(orders)
        .set({ status: 'paid' })
        .where(eq(orders.id, orderId));
      
      return c.json({ success: true, message: 'Payment verified successfully!' });
    } else {
      return c.json({ success: false, error: result.message || 'Payment not found' });
    }
  } catch (error) {
    console.error('Verify payment error:', error);
    return c.json({ success: false, error: 'Failed to verify payment' }, 500);
  }
});

app.get('/test-khqr2', async (c) => {
  try {
    const crypto = require('node:crypto');
    const dummyQr = '00020101021229200016seab_koeurn@bkrt520459995303840540511.505802KH5914Vibe Lifestyle6010Phnom Penh620901051234599340013178687249993201131786873399930630481DE';
    const md5 = crypto.createHash('md5').update(dummyQr).digest('hex');
    return c.json({ success: true, md5 });
  } catch (err: any) {
    return c.json({ success: false, error: err.message });
  }
});

export default app;