import { eq, and, gt, lt, sql } from 'drizzle-orm';
import { orders, products } from '../db/schema';
import { createDb } from '../db/connection';
import { BakongService } from '../services/bakongService';

export async function checkPendingPayments(env: any) {
  try {
    const db = createDb(env);
    const bakongService = new BakongService(env);
    
    // 1. Find all expired pending orders and restore stock
    const expiredOrders = await db
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.status, 'pending'),
          lt(orders.expires_at, new Date())
        )
      );

    if (expiredOrders.length > 0) {
      console.log(`[Cron] Found ${expiredOrders.length} expired orders. Restoring stock...`);
      for (const order of expiredOrders) {
        // Mark as expired
        await db
          .update(orders)
          .set({ status: 'expired' })
          .where(eq(orders.id, order.id));

        // Restore stock
        if (order.items) {
          try {
            const itemsStr = typeof order.items === 'string' ? order.items : JSON.stringify(order.items);
            const items = JSON.parse(itemsStr);
            for (const item of items) {
              if (item.id && item.quantity) {
                await db
                  .update(products)
                  .set({ stock: sql`stock + ${item.quantity}` })
                  .where(eq(products.id, item.id));
              }
            }
          } catch (e) {
            console.error(`[Cron] Failed to restore stock for order ${order.id}:`, e);
          }
        }
      }
    }

    // 2. Find all pending Bakong orders that haven't expired yet
    const pendingOrders = await db
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.status, 'pending'),
          eq(orders.payment_method, 'Bakong KHQR'),
          gt(orders.expires_at, new Date())
        )
      );
      
    if (pendingOrders.length === 0) return;
    
    console.log(`[Cron] Checking payments for ${pendingOrders.length} pending orders`);
    
    for (const order of pendingOrders) {
      if (!order.qr_string || order.qr_string === '{}') continue;
      
      const result = await bakongService.checkTransaction(order.qr_string);
      
      if (result.success) {
        console.log(`[Cron] Payment verified for order ${order.order_code}! Updating status...`);
        await db
          .update(orders)
          .set({ status: 'paid' })
          .where(eq(orders.id, order.id));
      }
    }
  } catch (error) {
    console.error('[Cron] Error checking pending payments:', error);
  }
}
