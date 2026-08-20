import { eq, desc, sql } from 'drizzle-orm';
import { users, orders } from '../db/schema';
import { parseJsonSafe } from '../utils/helpers';
import type { DrizzleDB } from '../types';

export class UserService {
  private db: DrizzleDB;

  constructor(db: DrizzleDB) {
    this.db = db;
  }

  async getProfile(userId: string, tgUser: any, ctx: any) {
    if (tgUser) {
      const tgName = [tgUser.first_name, tgUser.last_name].filter(Boolean).join(' ');
      // Run the upsert in the background if ctx is available
      const upsertPromise = this.db.execute(
        sql`INSERT INTO users (user_id, user_name, username, photo_url, last_seen, last_updated)
            VALUES (${userId}, ${tgName}, ${tgUser.username || ''}, ${tgUser.photo_url || ''}, NOW(), NOW())
            ON CONFLICT (user_id) DO UPDATE SET
              user_name = COALESCE(users.user_name, EXCLUDED.user_name),
              username = EXCLUDED.username,
              photo_url = EXCLUDED.photo_url,
              last_seen = NOW()`
      );
      
      if (ctx?.waitUntil) {
        ctx.waitUntil(upsertPromise);
      } else {
        await upsertPromise;
      }
    }

    const result = await this.db.select().from(users).where(eq(users.user_id, userId)).limit(1);

    if (!result.length) {
      return { 
        user_id: userId, 
        user_name: tgUser ? [tgUser.first_name, tgUser.last_name].filter(Boolean).join(' ') : '',
        username: tgUser?.username || '',
        photo_url: tgUser?.photo_url || '',
        loyalty_points: 0, 
        phone: '', 
        address: '',
        role: 'user',
        is_banned: false,
        total_spent: 0,
        vip_tier: 'none'
      };
    }

    const u = result[0];

    // Calculate total spent for VIP Status
    const spentRes = await this.db.execute(
      sql`SELECT SUM(total) as total_spent FROM orders WHERE user_id = ${userId} AND status = 'delivered'`
    );
    const totalSpentStr = (spentRes.rows[0] as any)?.total_spent;
    const totalSpent = totalSpentStr ? parseFloat(totalSpentStr) : 0;

    let vipTier = 'none';
    if (totalSpent >= 1000) vipTier = 'diamond';
    else if (totalSpent >= 500) vipTier = 'gold';
    else if (totalSpent >= 100) vipTier = 'silver';

    return {
      user_id: u.user_id,
      user_name: tgUser ? [tgUser.first_name, tgUser.last_name].filter(Boolean).join(' ') : (u.user_name || ''),
      username: tgUser?.username || u.username || '',
      phone: u.phone || '',
      address: u.address || '',
      role: u.role,
      is_banned: u.is_banned,
      loyalty_points: u.loyalty_points || 0,
      photo_url: tgUser?.photo_url || u.photo_url || '',
      last_seen: u.last_seen?.toISOString(),
      total_spent: totalSpent,
      vip_tier: vipTier,
    };
  }

  async updateProfile(userId: string, updates: { phone?: string; address?: string }) {
    await this.db.update(users)
      .set({
        ...updates,
        last_updated: sql`NOW()`,
      })
      .where(eq(users.user_id, userId));
  }

  async getPurchaseHistory(userId: string) {
    const userOrders = await this.db.select()
      .from(orders)
      .where(eq(orders.user_id, userId))
      .orderBy(desc(orders.created_at));

    return userOrders.map(order => ({
      id: order.id,
      order_code: order.order_code,
      status: order.status,
      total: parseFloat(order.total),
      subtotal: parseFloat(order.subtotal || '0'),
      delivery_fee: parseFloat(order.delivery_fee || '0'),
      discount_amount: parseFloat(order.discount_amount || '0'),
      created_at: order.created_at.toISOString(),
      items: parseJsonSafe(order.items as string, []),
      address: order.address,
      province: order.province,
      phone: order.phone,
      note: order.note,
      payment_method: order.payment_method,
      delivery_company: order.delivery_company,
      tracking_number: order.tracking_number,
      receipt_url: order.receipt_url,
    }));
  }
}
