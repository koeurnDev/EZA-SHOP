import { Hono } from 'hono';
import { z } from 'zod';
import { eq, sql } from 'drizzle-orm';
import { createDb } from '../db/connection';
import { users } from '../db/schema';
import { UserService } from '../services/userService';
import { telegramAuth } from '../middleware/auth';
import { sanitizeString, validatePhone } from '../utils/helpers';
import type { Env, Variables } from '../types';

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

/**
 * GET /api/user/profile
 */
app.get('/profile', telegramAuth, async (c) => {
  try {
    const userId = c.get('userId');
    const tgUser = c.get('tgUser');
    const db = createDb(c.env);
    const userService = new UserService(db);

    const profile = await userService.getProfile(userId, tgUser, c.executionCtx);

    return c.json({
      success: true,
      profile,
    });
  } catch (error) {
    console.error('getProfile error:', error);
    return c.json({ success: false, error: 'Failed to fetch profile' }, 500);
  }
});

/**
 * PUT /api/user/profile
 */
app.put('/profile', telegramAuth, async (c) => {
  try {
    const userId = c.get('userId');
    const body = await c.req.json();

    const profileSchema = z.object({
      phone: z.string().max(20).optional(),
      address: z.string().max(255).optional(),
    });

    const result = profileSchema.safeParse(body);
    if (!result.success) {
      return c.json({ success: false, error: 'Invalid data format' }, 400);
    }

    const { phone, address } = result.data;
    
    if (phone && !validatePhone(phone)) {
      return c.json({ success: false, error: 'Invalid phone number format' }, 400);
    }

    const db = createDb(c.env);
    const userService = new UserService(db);

    await userService.updateProfile(userId, {
      phone: phone ? sanitizeString(phone) : undefined,
      address: address ? sanitizeString(address) : undefined,
    });

    return c.json({ success: true, message: 'Profile updated' });
  } catch (error) {
    console.error('updateProfile error:', error);
    return c.json({ success: false, error: 'Failed to update profile' }, 500);
  }
});

/**
 * PUT /api/user/cart
 * Sync user cart to backend for Abandoned Cart recovery
 */
app.put('/cart', telegramAuth, async (c) => {
  try {
    const userId = c.get('userId');
    const body = await c.req.json();
    const db = createDb(c.env);
    
    // Safely store cart as JSON string
    const cartState = JSON.stringify(body.cart || []);
    const dummyEmail = `tg_${userId}@vibelifestyle.local`;

    await db.execute(
      sql`INSERT INTO users (user_id, email, cart_state, cart_updated_at, is_cart_reminded)
          VALUES (${userId}, ${dummyEmail}, ${cartState}, NOW(), false)
          ON CONFLICT (user_id) DO UPDATE SET
            cart_state = EXCLUDED.cart_state,
            cart_updated_at = NOW(),
            is_cart_reminded = false`
    );

    return c.json({ success: true });
  } catch (error) {
    console.error('updateCart error:', error);
    return c.json({ success: false, error: 'Failed to sync cart' }, 500);
  }
});

/**
 * GET /api/user/orders - Purchase History
 */
app.get('/orders', telegramAuth, async (c) => {
  try {
    const userId = c.get('userId');
    const db = createDb(c.env);
    const userService = new UserService(db);

    const formattedOrders = await userService.getPurchaseHistory(userId);

    return c.json({
      success: true,
      orders: formattedOrders,
    });
  } catch (error) {
    console.error('getOrders error:', error);
    return c.json({ success: false, error: 'Failed to fetch orders' }, 500);
  }
});

/**
 * DELETE /api/user/account - Request account deletion
 */
app.delete('/account', telegramAuth, async (c) => {
  try {
    const userId = c.get('userId');
    const db = createDb(c.env);
    
    // Instead of deleting immediately, we mark as pending deletion for compliance
    // or just ban/deactivate them depending on requirements.
    // For now, let's just anonymize.
    await db.update(users)
      .set({
        user_name: 'Deleted User',
        username: null,
        phone: null,
        address: null,
        photo_url: null,
        is_banned: true // effectively disables account
      })
      .where(eq(users.user_id, userId));
      
    return c.json({ success: true, message: 'Account scheduled for deletion' });
  } catch (error) {
    console.error('Account deletion error:', error);
    return c.json({ success: false, error: 'Failed to delete account' }, 500);
  }
});

export default app;
