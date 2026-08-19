import { eq, desc, count, sql } from 'drizzle-orm';
import { products, orders, users, categories, settings } from '../db/schema';
import type { DrizzleDB } from '../types';

export class AdminService {
  private db: DrizzleDB;

  constructor(db: DrizzleDB) {
    this.db = db;
  }

  async getDashboardData(userId: string, superAdminId: string, isAdmin: boolean) {
    // Get user role
    const currentUser = await this.db.select({ role: users.role }).from(users).where(eq(users.user_id, userId)).limit(1);
    const dbRole = currentUser[0]?.role;
    
    // Compare userId directly with SUPERADMIN_ID as fallback
    const cleanSuperAdminId = (superAdminId || '').trim().replace(/^["']|["']$/g, '');
    const isSuperAdmin = isAdmin || userId === cleanSuperAdminId;
    const userRole = isSuperAdmin ? 'admin' : (dbRole || 'staff');

    // Get counts
    const [productCount] = await this.db.select({ count: count() }).from(products);
    const [orderCount] = await this.db.select({ count: count() }).from(orders);
    const [userCount] = await this.db.select({ count: count() }).from(users);

    // Get all settings (needed by AdminSettingsTab)
    const allSettings = await this.db.select().from(settings);
    const settingsMap = allSettings.reduce((acc, s) => {
      acc[s.key] = s.value || '';
      return acc;
    }, {} as Record<string, string>);

    // Get all products (needed by AdminProductsTab)
    const allProducts = await this.db
      .select()
      .from(products)
      .orderBy(desc(products.created_at));

    // Get all categories
    const allCategories = await this.db.select().from(categories);

    // Get all orders for AdminOrdersTab
    const allOrders = await this.db
      .select()
      .from(orders)
      .orderBy(desc(orders.created_at))
      .limit(150);

    // Get recent orders
    const recentOrders = await this.db
      .select()
      .from(orders)
      .orderBy(desc(orders.created_at))
      .limit(10);

    // Get low stock products
    const lowStockProducts = await this.db
      .select()
      .from(products)
      .where(sql`stock <= 5`)
      .orderBy(products.stock)
      .limit(10);

    // Order statistics
    const orderStats = await this.db
      .select({
        status: orders.status,
        count: count(),
        total: sql<string>`SUM(${orders.total})`,
      })
      .from(orders)
      .groupBy(orders.status);

    // Daily Analytics (last 14 days)
    const dailyAnalytics = await this.db.execute(sql`
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
    const pendingOrdersCount = orderStats.find(s => s.status === 'pending')?.count || 0;

    return {
      role: userRole,
      isSuperAdmin,
      summary: {
        products: productCount.count,
        orders: orderCount.count,
        customers: userCount.count,
        totalRevenue,
        pendingOrders: pendingOrdersCount
      },
      orderStats,
      dailyAnalytics: dailyAnalytics.rows,
      recentOrders: recentOrders.map(order => ({
        ...order,
        items: typeof order.items === 'string' ? JSON.parse(order.items) : order.items
      })),
      lowStockProducts,
      settings: settingsMap,
      products: allProducts.map(product => ({
        ...product,
        variants: typeof product.variants === 'string' ? JSON.parse(product.variants || '[]') : [],
        additional_images: typeof product.additional_images === 'string' ? JSON.parse(product.additional_images || '[]') : []
      })),
      categories: allCategories,
      orders: allOrders.map(order => ({
        ...order,
        items: typeof order.items === 'string' ? JSON.parse(order.items) : order.items
      }))
    };
  }

  async broadcastMessage(botToken: string, message: string, photoUrl: string | undefined, buttonUrl: string | undefined, ctx: any) {
    if (!message && !photoUrl) {
      throw new Error('Message or Photo is required');
    }

    // Fetch all unique users who have interacted with the bot
    const allUsers = await this.db.select({ user_id: users.user_id }).from(users).where(sql`${users.user_id} IS NOT NULL`);
    
    const sendBroadcast = async () => {
      let successCount = 0;
      let failCount = 0;
      
      const replyMarkup = buttonUrl ? {
        inline_keyboard: [[{ text: '🛍️ Open Shop', url: buttonUrl }]]
      } : undefined;

      for (const u of allUsers) {
        if (!u.user_id) continue;
        
        try {
          let apiUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
          let payload: any = {
            chat_id: u.user_id,
            text: message,
            parse_mode: 'HTML',
            reply_markup: replyMarkup
          };

          if (photoUrl) {
            apiUrl = `https://api.telegram.org/bot${botToken}/sendPhoto`;
            payload = {
              chat_id: u.user_id,
              photo: photoUrl,
              caption: message || '',
              parse_mode: 'HTML',
              reply_markup: replyMarkup
            };
          }

          const res = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          
          if (res.ok) successCount++;
          else failCount++;
          
          await new Promise(r => setTimeout(r, 50)); 
        } catch (e) {
          failCount++;
        }
      }
      console.log(`Broadcast finished. Success: ${successCount}, Fail: ${failCount}`);
    };

    if (ctx && ctx.waitUntil) {
      ctx.waitUntil(sendBroadcast());
    } else {
      await sendBroadcast();
    }

    return { count: allUsers.length };
  }

  async getUserAvatar(botToken: string, userId: string) {
    if (!botToken) throw new Error('No token configured');

    const photoRes = await fetch(`https://api.telegram.org/bot${botToken}/getUserProfilePhotos?user_id=${userId}&limit=1`);
    const photoData: any = await photoRes.json();

    if (photoData.ok && photoData.result.total_count > 0) {
      const photos = photoData.result.photos[0];
      const smallestPhoto = photos[0];
      const fileId = smallestPhoto.file_id;

      const fileRes = await fetch(`https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`);
      const fileData: any = await fileRes.json();

      if (fileData.ok) {
        return `https://api.telegram.org/file/bot${botToken}/${fileData.result.file_path}`;
      }
    }
    return null;
  }
}
