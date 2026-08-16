import { Hono } from 'hono';
import { eq, and, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { createDb } from '../db/connection';
import { wishlist, products } from '../db/schema';
import { telegramAuth } from '../middleware/auth';
import { parseJsonSafe, getEffectivePrice } from '../utils/helpers';
import type { Env, Variables } from '../types';

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

/**
 * GET /api/wishlist - Get user's wishlist with full product details
 */
app.get('/', telegramAuth, async (c) => {
  try {
    const userId = c.get('userId');
    const db = createDb(c.env);

    const items = await db
      .select()
      .from(wishlist)
      .where(eq(wishlist.user_id, userId));

    const productIds = items.map(i => i.product_id);

    if (!productIds.length) {
      return c.json({ success: true, wishlist: [], productIds: [] });
    }

    const wishlistProducts = await db
      .select()
      .from(products)
      .where(inArray(products.id, productIds));

    const formatted = wishlistProducts.map(p => ({
      id: p.id,
      name: p.name,
      price: getEffectivePrice(
        parseFloat(p.price),
        p.flash_sale_price ? parseFloat(p.flash_sale_price) : undefined,
        p.flash_sale_end?.toISOString()
      ),
      original_price: parseFloat(p.price),
      category: p.category,
      image: p.image,
      stock: p.stock,
      description: p.description,
      additional_images: parseJsonSafe(p.additional_images as string, []),
    }));

    return c.json({
      success: true,
      wishlist: productIds,        // array of IDs — matches frontend useWishlist hook
      products: formatted,         // full product details for display
      productIds,
    });
  } catch (error) {
    console.error('getWishlist error:', error);
    return c.json({ success: false, error: 'Failed to fetch wishlist' }, 500);
  }
});

/**
 * POST /api/wishlist/toggle - Add or remove product from wishlist
 */
app.post('/toggle', telegramAuth, async (c) => {
  try {
    const userId = c.get('userId');
    const body = await c.req.json();

    const schema = z.object({ productId: z.coerce.number().int().positive() });
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return c.json({ success: false, error: 'Invalid productId' }, 400);
    }

    const productId = parsed.data.productId;
    const db = createDb(c.env);

    // Check if already in wishlist
    const existing = await db
      .select()
      .from(wishlist)
      .where(and(eq(wishlist.user_id, userId), eq(wishlist.product_id, productId)))
      .limit(1);

    let action: 'added' | 'removed';

    if (existing.length > 0) {
      await db
        .delete(wishlist)
        .where(and(eq(wishlist.user_id, userId), eq(wishlist.product_id, productId)));
      action = 'removed';
    } else {
      await db.insert(wishlist).values({ user_id: userId, product_id: productId });
      action = 'added';
    }

    // Return updated product IDs
    const all = await db.select().from(wishlist).where(eq(wishlist.user_id, userId));
    const productIds = all.map(i => i.product_id);

    return c.json({ 
      success: true, 
      action,
      added: action === 'added',   // boolean — matches frontend check
      productIds,
    });
  } catch (error) {
    console.error('toggleWishlist error:', error);
    return c.json({ success: false, error: 'Failed to update wishlist' }, 500);
  }
});

export default app;
