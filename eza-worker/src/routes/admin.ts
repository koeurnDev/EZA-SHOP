import { Hono } from 'hono';
import { eq, desc, count, sql } from 'drizzle-orm';
import { z } from 'zod';
import { createDb } from '../db/connection';
import { products, orders, users, categories, settings } from '../db/schema';
import { telegramAuth, adminAuth } from '../middleware/auth';
import { parseJsonSafe } from '../utils/helpers';
import type { Env, Variables } from '../types';

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

// Apply admin authentication to all routes
app.use('*', telegramAuth, adminAuth);

/**
 * GET /api/admin/dashboard - Admin dashboard data
 */
app.get('/dashboard', async (c) => {
  try {
    const db = createDb(c.env);

    // Get user role
    const userId = c.get('userId') as string;
    const currentUser = await db.select({ role: users.role }).from(users).where(eq(users.user_id, userId)).limit(1);
    const dbRole = currentUser[0]?.role;
    // Compare userId directly with SUPERADMIN_ID as fallback (handles whitespace/quote issues)
    const superAdminId = (c.env.SUPERADMIN_ID || '').trim().replace(/^["']|["']$/g, '');
    const isSuperAdmin = c.get('isAdmin') || userId === superAdminId;
    console.log('[ROLE DEBUG] userId:', JSON.stringify(userId), 'SUPERADMIN_ID:', JSON.stringify(superAdminId), 'isAdmin:', c.get('isAdmin'), 'match:', userId === superAdminId);
    const userRole = isSuperAdmin ? 'admin' : (dbRole || 'staff');

    // Get counts
    const [productCount] = await db.select({ count: count() }).from(products);
    const [orderCount] = await db.select({ count: count() }).from(orders);
    const [userCount] = await db.select({ count: count() }).from(users);

    // Get all settings (needed by AdminSettingsTab)
    const allSettings = await db.select().from(settings);
    const settingsMap = allSettings.reduce((acc, s) => {
      acc[s.key] = s.value || '';
      return acc;
    }, {} as Record<string, string>);

    // Get all products (needed by AdminProductsTab)
    const allProducts = await db
      .select()
      .from(products)
      .orderBy(desc(products.created_at));

    // Get all categories
    const allCategories = await db.select().from(categories);

    // Get all orders for AdminOrdersTab
    const allOrders = await db
      .select()
      .from(orders)
      .orderBy(desc(orders.created_at))
      .limit(150);

    // Get recent orders
    const recentOrders = await db
      .select()
      .from(orders)
      .orderBy(desc(orders.created_at))
      .limit(10);

    // Get low stock products
    const lowStockProducts = await db
      .select()
      .from(products)
      .where(sql`stock <= 5`)
      .orderBy(products.stock)
      .limit(10);

    // Order statistics
    const orderStats = await db
      .select({
        status: orders.status,
        count: count(),
        total: sql<string>`SUM(${orders.total})`,
      })
      .from(orders)
      .groupBy(orders.status);

    // Daily Analytics (last 14 days)
    const dailyAnalytics = await db.execute(sql`
      SELECT 
        DATE(created_at) as date,
        SUM(total::numeric) as revenue,
        COUNT(*) as orders
      FROM orders
      WHERE created_at >= NOW() - INTERVAL '14 days' AND status != 'cancelled'
      GROUP BY DATE(created_at)
      ORDER BY DATE(created_at) ASC
    `);

    // Calculate Summary stats
    const totalRevenue = orderStats.filter(s => s.status === 'delivered' || s.status === 'shipped').reduce((sum, s) => sum + parseFloat(s.total || '0'), 0);
    const activeOrders = orderStats.filter(s => s.status && ['pending', 'paid', 'processing', 'shipped', 'delivering'].includes(s.status)).reduce((sum, s) => sum + Number(s.count), 0);

    return c.json({
      success: true,
      userRole,
      settings: settingsMap,
      summary: {
        totalRevenue: totalRevenue,
        totalOrders: Number(orderCount.count),
        activeOrders: activeOrders,
        totalCustomers: Number(userCount.count),
        businessHealth: 100
      },
      analytics: {
        daily: dailyAnalytics.rows || [],
        status: orderStats.map(stat => ({
          status: stat.status,
          count: stat.count,
          total: parseFloat(stat.total || '0'),
        }))
      },
      products: allProducts.map(product => ({
        id: product.id,
        name: product.name,
        price: parseFloat(product.price),
        category: product.category,
        image: product.image,
        stock: product.stock,
        description: product.description || '',
        additional_images: product.additional_images ? parseJsonSafe(product.additional_images, []) : [],
        variants: product.variants ? parseJsonSafe(product.variants, []) : [],
        flash_sale_price: product.flash_sale_price ? parseFloat(product.flash_sale_price) : null,
        flash_sale_end: product.flash_sale_end?.toISOString() || null,
        video_url: product.video_url || null,
        created_at: product.created_at.toISOString(),
      })),
      categories: allCategories.map(cat => ({
        id: cat.id,
        name: cat.name,
        created_at: new Date().toISOString(),
      })),
      orders: allOrders.map(order => ({
        id: order.id,
        order_code: order.order_code,
        user_id: order.user_id,
        user_name: order.user_name,
        total: parseFloat(order.total),
        subtotal: parseFloat(order.subtotal || '0'),
        delivery_fee: parseFloat(order.delivery_fee || '0'),
        items: parseJsonSafe(order.items as string, []),
        status: order.status,
        phone: order.phone,
        address: order.address,
        province: order.province,
        delivery_company: order.delivery_company,
        payment_method: order.payment_method,
        tracking_number: order.tracking_number,
        expires_at: order.expires_at?.toISOString() || null,
        created_at: order.created_at.toISOString(),
      })),
      dashboard: {
        stats: {
          products: productCount.count,
          orders: orderCount.count,
          users: userCount.count,
        },
        recent_orders: recentOrders.map(order => ({
          id: order.id,
          order_code: order.order_code,
          user_name: order.user_name,
          total: parseFloat(order.total),
          status: order.status,
          created_at: order.created_at.toISOString(),
        })),
        low_stock_products: lowStockProducts.map(product => ({
          id: product.id,
          name: product.name,
          stock: product.stock,
          category: product.category,
        })),
        order_stats: orderStats.map(stat => ({
          status: stat.status,
          count: stat.count,
          total: parseFloat(stat.total || '0'),
        })),
      },
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    return c.json({ 
      success: false, 
      error: 'Failed to fetch dashboard data',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

/**
 * GET /api/admin/products - Get all products for admin
 */
app.get('/products', async (c) => {
  try {
    const db = createDb(c.env);
    const allProducts = await db
      .select()
      .from(products)
      .orderBy(desc(products.created_at));

    const formattedProducts = allProducts.map(product => ({
      id: product.id,
      name: product.name,
      price: parseFloat(product.price),
      category: product.category,
      image: product.image,
      stock: product.stock,
      description: product.description,
      additional_images: parseJsonSafe(product.additional_images as string, []),
      variants: parseJsonSafe(product.variants as string, []),
      flash_sale_price: product.flash_sale_price ? parseFloat(product.flash_sale_price) : null,
      flash_sale_end: product.flash_sale_end?.toISOString() || null,
      video_url: product.video_url,
      created_at: product.created_at.toISOString(),
    }));

    return c.json({
      success: true,
      products: formattedProducts,
      total: formattedProducts.length,
    });
  } catch (error) {
    console.error('Admin products error:', error);
    return c.json({ 
      success: false, 
      error: 'Failed to fetch products',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

/**
 * PUT /api/admin/products/:id/stock - Update product stock
 */
app.put('/products/:id/stock', async (c) => {
  try {
    const productId = parseInt(c.req.param('id'));
    const body = await c.req.json();
    
    const stockSchema = z.object({
      stock: z.number().int().min(0),
    });

    const validationResult = stockSchema.safeParse(body);
    if (!validationResult.success) {
      return c.json({ 
        success: false, 
        error: 'Invalid stock value',
        details: validationResult.error.issues
      }, 400);
    }

    const db = createDb(c.env);
    const updatedProduct = await db
      .update(products)
      .set({ stock: validationResult.data.stock })
      .where(eq(products.id, productId))
      .returning();

    if (updatedProduct.length === 0) {
      return c.json({ success: false, error: 'Product not found' }, 404);
    }

    return c.json({
      success: true,
      message: 'Stock updated successfully',
      product: {
        id: updatedProduct[0].id,
        name: updatedProduct[0].name,
        stock: updatedProduct[0].stock,
      },
    });
  } catch (error) {
    console.error('Update stock error:', error);
    return c.json({ 
      success: false, 
      error: 'Failed to update stock',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

/**
 * GET /api/admin/orders - Get all orders for admin
 */
app.get('/orders', async (c) => {
  try {
    const status = c.req.query('status');
    const limit = parseInt(c.req.query('limit') || '50');
    const offset = parseInt(c.req.query('offset') || '0');

    const db = createDb(c.env);
    
    let allOrders;
    if (status) {
      allOrders = await db
        .select()
        .from(orders)
        .where(eq(orders.status, status))
        .orderBy(desc(orders.created_at))
        .limit(Math.min(limit, 100))
        .offset(offset);
    } else {
      allOrders = await db
        .select()
        .from(orders)
        .orderBy(desc(orders.created_at))
        .limit(Math.min(limit, 100))
        .offset(offset);
    }

    const formattedOrders = allOrders.map(order => ({
      id: order.id,
      order_code: order.order_code,
      user_id: order.user_id,
      user_name: order.user_name,
      total: parseFloat(order.total),
      subtotal: parseFloat(order.subtotal || '0'),
      delivery_fee: parseFloat(order.delivery_fee || '0'),
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
      pagination: {
        limit,
        offset,
        has_more: formattedOrders.length === limit,
      },
    });
  } catch (error) {
    console.error('Admin orders error:', error);
    return c.json({ 
      success: false, 
      error: 'Failed to fetch orders',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

/**
 * PUT /api/admin/orders/:id/status - Update order status
 */
app.put('/orders/:id/status', async (c) => {
  try {
    const paramId = c.req.param('id');
    const orderId = parseInt(paramId);
    const body = await c.req.json();
    
    const statusSchema = z.object({
      status: z.enum(['pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled', 'expired']),
      tracking_number: z.string().optional(),
    });

    const validationResult = statusSchema.safeParse(body);
    if (!validationResult.success) {
      return c.json({ 
        success: false, 
        error: 'Invalid status data',
        details: validationResult.error.issues
      }, 400);
    }

    const db = createDb(c.env);

    // Get old order to prevent double awarding points
    const [oldOrder] = await db.select().from(orders).where(isNaN(orderId) ? eq(orders.order_code, paramId) : eq(orders.id, orderId));
    if (!oldOrder) {
      return c.json({ success: false, error: 'Order not found' }, 404);
    }

    const updateData: any = { status: validationResult.data.status, last_updated: new Date() };
    
    if (validationResult.data.tracking_number) {
      updateData.tracking_number = validationResult.data.tracking_number;
    }

    const updatedOrder = await db
      .update(orders)
      .set(updateData)
      .where(eq(orders.id, oldOrder.id))
      .returning();

    // --- LOYALTY POINTS EARNING LOGIC ---
    const targetUserId = updatedOrder[0].user_id;
    let referralBonusGiven = false;
    if (targetUserId) {
      const newStatus = validationResult.data.status;
      const oldStatus = oldOrder.status;
      const pointsToAward = Math.floor(parseFloat(updatedOrder[0].gross_total || updatedOrder[0].total));

      if (pointsToAward > 0) {
        if (oldStatus !== 'delivered' && newStatus === 'delivered') {
          // Add points
          await db.update(users)
            .set({ loyalty_points: sql`COALESCE(loyalty_points, 0) + ${pointsToAward}` })
            .where(eq(users.user_id, targetUserId));
            
          // Check for Referral
          try {
            const buyer = await db.select().from(users).where(eq(users.user_id, targetUserId)).limit(1);
            if (buyer.length > 0 && buyer[0].referred_by) {
              const orderCountRes = await db.execute(sql`SELECT COUNT(*) as count FROM orders WHERE user_id = ${targetUserId} AND status = 'delivered'`);
              const count = parseInt((orderCountRes.rows[0] as any).count || '0');
              if (count === 1) { // This is the first delivered order
                const referrerId = buyer[0].referred_by;
                referralBonusGiven = true;
                
                // Give 10 points to referrer
                await db.update(users)
                  .set({ loyalty_points: sql`COALESCE(loyalty_points, 0) + 10` })
                  .where(eq(users.user_id, referrerId));
                  
                // Give 10 points to buyer
                await db.update(users)
                  .set({ loyalty_points: sql`COALESCE(loyalty_points, 0) + 10` })
                  .where(eq(users.user_id, targetUserId));
                  
                // Notify referrer
                try {
                  await fetch(`https://api.telegram.org/bot${c.env.BOT_TOKEN}/sendMessage`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ chat_id: referrerId, text: `🎉 អបអរសាទរ! មិត្តភក្ដិដែលអ្នកបានណែនាំបានទិញទំនិញជោគជ័យ អ្នកទទួលបាន 10 ពិន្ទុ!`, parse_mode: 'Markdown' }),
                  });
                } catch (e) {}
              }
            }
          } catch(e) {
            console.error('Referral logic error:', e);
          }
        } else if (oldStatus === 'delivered' && newStatus !== 'delivered') {
          // Remove points (clamp to 0)
          await db.update(users)
            .set({ loyalty_points: sql`GREATEST(0, COALESCE(loyalty_points, 0) - ${pointsToAward})` })
            .where(eq(users.user_id, targetUserId));
        }
      }
    }

    // --- TELEGRAM NOTIFICATION ---
    if (targetUserId) {
      const statusMap: Record<string, string> = {
        paid: 'បានបង់ប្រាក់រួចរាល់ ✅',
        processing: 'កំពុងរៀបចំអីវ៉ាន់ 📦',
        shipped: 'ប្រគល់ជូនអ្នកដឹកជញ្ជូន 🚚',
        delivered: 'បានដល់ដៃអតិថិជន 🎉',
        cancelled: 'បោះបង់ ❌',
      };
      let msg = `🛍️ ការបញ្ជាទិញរបស់បង លេខសម្គាល់  ${updatedOrder[0].order_code} ត្រូវបានប្តូរទៅ ${statusMap[updatedOrder[0].status || ''] || updatedOrder[0].status}`;

      if (validationResult.data.status === 'delivered') {
         const pointsToAward = Math.floor(parseFloat(updatedOrder[0].gross_total || updatedOrder[0].total));
         if (pointsToAward > 0) {
            msg += `\n\n🎁 អបអរសាទរ! អ្នកទទួលបាន ${pointsToAward} ពិន្ទុពីការបញ្ជាទិញនេះ។`;
         }
         if (referralBonusGiven) {
            msg += `\n🌟 អ្នកក៏ទទួលបាន 10 ពិន្ទុបន្ថែមពីការទិញលើកដំបូងរបស់អ្នកតាមរយៈ Link ណែនាំ!`;
         }
      }

      try {
        await fetch(`https://api.telegram.org/bot${c.env.BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: targetUserId, text: msg, parse_mode: 'Markdown' }),
        });
      } catch (tgErr) {
        console.error('Failed to send TG notify', tgErr);
      }
    }

    return c.json({
      success: true,
      message: 'Order status updated successfully',
      order: {
        id: updatedOrder[0].id,
        order_code: updatedOrder[0].order_code,
        status: updatedOrder[0].status,
        tracking_number: updatedOrder[0].tracking_number,
      },
    });
  } catch (error) {
    console.error('Update order status error:', error);
    return c.json({ 
      success: false, 
      error: 'Failed to update order status',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

/**
 * GET /api/admin/settings - Get all settings
 */
app.get('/settings', async (c) => {
  try {
    const db = createDb(c.env);
    const allSettings = await db.select().from(settings);
    
    const settingsMap = allSettings.reduce((acc, setting) => {
      acc[setting.key] = setting.value || '';
      return acc;
    }, {} as Record<string, string>);

    return c.json({
      success: true,
      settings: settingsMap,
    });
  } catch (error) {
    console.error('Settings error:', error);
    return c.json({ 
      success: false, 
      error: 'Failed to fetch settings',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

export default app;