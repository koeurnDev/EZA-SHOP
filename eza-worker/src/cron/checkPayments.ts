import { eq, and, gt } from 'drizzle-orm';
import { orders } from '../db/schema';
import { createDb } from '../db/connection';
import { BakongService } from '../services/bakongService';

export async function checkPendingPayments(env: any) {
  try {
    const db = createDb(env);
    const bakongService = new BakongService(env);
    
    // Find all pending Bakong orders that haven't expired yet
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
          .set({ status: 'paid', last_updated: new Date() })
          .where(eq(orders.id, order.id));
      }
    }
  } catch (error) {
    console.error('[Cron] Error checking pending payments:', error);
  }
}
