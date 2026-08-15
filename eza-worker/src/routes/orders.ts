import { Hono } from 'hono';
import { eq, desc } from 'drizzle-orm';
import { z } from 'zod';
import { createDb } from '../db/connection';
import { orders, products, settings } from '../db/schema';
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
  address: z.string().min(5),
  province: z.string().min(2),
  note: z.string().optional(),
  delivery_company: z.string(),
  payment_method: z.string().default('Bakong KHQR'),
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

    const { items, phone, address, province, note, delivery_company, payment_method } = validationResult.data;

    // Validate phone
    if (!validatePhone(phone)) {
      return c.json({ success: false, error: 'Invalid phone number format' }, 400);
    }

    const db = createDb(c.env);

    // Verify products and stock
    const productIds = items.map(item => item.id);
    const dbProducts = await db
      .select()
      .from(products)
      .where(eq(products.id, productIds[0])); // We'll need to adjust this for multiple products

    const productMap = new Map(dbProducts.map(p => [p.id, p]));
    
    // Validate each item
    for (const item of items) {
      const dbProduct = productMap.get(item.id);
      if (!dbProduct) {
        return c.json({ success: false, error: `Product ${item.id} not found` }, 400);
      }
      if (dbProduct.stock < item.quantity) {
        return c.json({ 
          success: false, 
          error: `Insufficient stock for ${dbProduct.name}. Available: ${dbProduct.stock}, Requested: ${item.quantity}` 
        }, 400);
      }
    }

    // Calculate totals
    let subtotal = 0;
    const validatedItems: OrderItem[] = [];

    for (const item of items) {
      const dbProduct = productMap.get(item.id);
      if (dbProduct) {
        const effectivePrice = getEffectivePrice(
          parseFloat(dbProduct.price),
          dbProduct.flash_sale_price ? parseFloat(dbProduct.flash_sale_price) : undefined,
          dbProduct.flash_sale_end?.toISOString()
        );
        
        const itemTotal = effectivePrice * item.quantity;
        subtotal += itemTotal;

        validatedItems.push({
          id: item.id,
          name: dbProduct.name,
          price: effectivePrice,
          quantity: item.quantity,
          image: dbProduct.image || undefined,
        });
      }
    }

    // Get delivery settings
    const deliverySettings = await db
      .select()
      .from(settings)
      .where(eq(settings.key, 'delivery_fee'));
    
    const deliveryThresholdSettings = await db
      .select()
      .from(settings)
      .where(eq(settings.key, 'delivery_threshold'));

    const deliveryFee = parseFloat(deliverySettings[0]?.value || '1.50');
    const deliveryThreshold = parseFloat(deliveryThresholdSettings[0]?.value || '50');
    
    const finalDeliveryFee = calculateDeliveryFee(subtotal, deliveryFee, deliveryThreshold);
    const discountAmount = 0; // No discount for now
    const grossTotal = subtotal - discountAmount + finalDeliveryFee;

    // Generate order code and expiry
    const orderCode = generateOrderCode();
    const expiresAt = generateExpiryTime();

    // Create order
    const newOrder = await db.insert(orders).values({
      user_id: userId,
      user_name: 'Guest', // We'll need to get this from user data
      items: JSON.stringify(validatedItems),
      total: grossTotal.toString(),
      subtotal: subtotal.toString(),
      discount_amount: discountAmount.toString(),
      delivery_fee: finalDeliveryFee.toString(),
      gross_total: grossTotal.toString(),
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

    // Update stock (subtract ordered quantities)
    for (const item of validatedItems) {
      await db
        .update(products)
        .set({ 
          stock: dbProducts.find(p => p.id === item.id)!.stock - item.quantity 
        })
        .where(eq(products.id, item.id));
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

export default app;