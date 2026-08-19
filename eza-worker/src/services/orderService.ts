import { eq, inArray, sql, and } from 'drizzle-orm';
// @ts-ignore
import { BakongKHQR, IndividualInfo, khqrData } from 'bakong-khqr';
import { products } from '../db/schema';
import { getEffectivePrice } from '../utils/helpers';
import type { OrderItem } from '../types';

export const OrderService = {
  async verifyStockAndCalculateTotals(items: any[], db: any) {
    const productIds = items.map(item => item.id);
    const dbProducts = await db
      .select()
      .from(products)
      .where(inArray(products.id, productIds));

    const productMap = new Map(dbProducts.map((p: any) => [p.id, p]));
    
    // Aggregate quantities
    const aggregatedItems = new Map<number, number>();
    for (const item of items) {
      aggregatedItems.set(item.id, (aggregatedItems.get(item.id) || 0) + item.quantity);
    }

    // Validate stock
    for (const [id, totalQuantity] of aggregatedItems.entries()) {
      const dbProduct: any = productMap.get(id);
      if (!dbProduct) {
        return { success: false, error: `Product ${id} not found` };
      }
      if (dbProduct.stock < totalQuantity) {
        return { success: false, error: `Insufficient stock for ${dbProduct.name}. Available: ${dbProduct.stock}, Requested: ${totalQuantity}` };
      }
    }

    let subtotal = 0;
    const validatedItems: OrderItem[] = [];

    for (const [id, totalQuantity] of aggregatedItems.entries()) {
      const dbProduct: any = productMap.get(id);
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

    return { success: true, subtotal, validatedItems };
  },

  async calculateDiscounts(subtotal: number, userId: string | undefined, couponCode: string | undefined, db: any) {
    let discountAmount = 0;
    let targetCouponId: number | null = null;

    if (couponCode) {
      const { coupons } = await import('../db/schema');
      const couponResult = await db.select().from(coupons).where(eq(coupons.code, couponCode.toUpperCase().trim())).limit(1);
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

    return { discountAmount, targetCouponId, vipDiscount };
  },

  async executeCompensatingTransaction(validatedItems: OrderItem[], targetCouponId: number | null, db: any) {
    let rolledBack = false;
    let couponDeducted = false;
    let stockError = '';
    const successfulStockDeductions: { id: number, qty: number }[] = [];

    // 1. Deduct Coupon Atomically
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

    // 2. Deduct Stock Atomically
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

    if (rolledBack) {
      await this.rollbackTransaction(successfulStockDeductions, couponDeducted, targetCouponId, db);
      return { success: false, error: stockError || 'Transaction failed due to concurrent modification' };
    }

    return { success: true, successfulStockDeductions, couponDeducted };
  },

  async rollbackTransaction(successfulStockDeductions: { id: number, qty: number }[], couponDeducted: boolean, targetCouponId: number | null, db: any) {
    for (const rollbackItem of successfulStockDeductions) {
      await db.update(products)
        .set({ stock: sql`stock + ${rollbackItem.qty}` })
        .where(eq(products.id, rollbackItem.id));
    }
    if (couponDeducted && targetCouponId) {
      const { coupons } = await import('../db/schema');
      await db.update(coupons)
        .set({ used_count: sql`COALESCE(used_count, 0) - 1` })
        .where(eq(coupons.id, targetCouponId));
    }
  },

  async generatePaymentQR(grossTotal: number, orderCode: string, expiresAt: Date, env: any, dbSettings: any) {
    let qrString = '';
    const bakongId = env.BAKONG_ACCOUNT_ID || dbSettings.bakong_account_id;
    const merchantName = env.BAKONG_MERCHANT_NAME || dbSettings.bakong_merchant_name;
    
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
    return qrString;
  },

  async processOrderDelivery(oldOrder: any, updatedOrder: any, db: any, env: any, executionCtx: any) {
    let referralBonusGiven = false;
    const targetUserId = updatedOrder.user_id;
    
    if (targetUserId) {
      const { users } = await import('../db/schema');
      const newStatus = updatedOrder.status;
      const oldStatus = oldOrder.status;
      const pointsToAward = Math.floor(parseFloat(updatedOrder.gross_total || updatedOrder.total));

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
                  await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/sendMessage`, {
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
      
      // --- TELEGRAM NOTIFICATION ---
      let additionalText = '';
      if (newStatus === 'delivered') {
        if (pointsToAward > 0) {
          additionalText += `🎁 អបអរសាទរ! លោកអ្នកទទួលបាន ${pointsToAward} ពិន្ទុពីការបញ្ជាទិញនេះ。\n`;
        }
        if (referralBonusGiven) {
          additionalText += `🎉 លោកអ្នកទទួលបាន 10 ពិន្ទុបន្ថែមពីការណែនាំមិត្តភ័ក្តិ! ប្រើ Link ណែនាំ ដើម្បីទទួលបានពិន្ទុបន្ថែមទៀត!`;
        }
      }

      const { sendCustomerStatusNotification } = await import('../utils/telegram');
      executionCtx.waitUntil(
        sendCustomerStatusNotification(env, {
          userId: targetUserId,
          orderCode: updatedOrder.order_code,
          phone: updatedOrder.phone,
          address: updatedOrder.address,
          province: updatedOrder.province,
          note: updatedOrder.note,
          items: typeof updatedOrder.items === 'string' ? JSON.parse(updatedOrder.items) : updatedOrder.items,
          grossTotal: updatedOrder.gross_total || updatedOrder.total,
          createdAt: updatedOrder.created_at
        }, newStatus, additionalText)
      );
    }
  }
};
