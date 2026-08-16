import { Hono } from 'hono';
import { sql } from 'drizzle-orm';
import { z } from 'zod';
import { createDb } from '../db/connection';
import { telegramAuth } from '../middleware/auth';
import type { Env, Variables } from '../types';

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

/**
 * GET /api/products/:productId/reviews
 */
app.get('/:productId/reviews', async (c) => {
  try {
    const productId = parseInt(c.req.param('productId'));
    if (isNaN(productId) || productId <= 0) {
      return c.json({ success: false, error: 'Invalid Product ID' }, 400);
    }

    const limit  = Math.min(parseInt(c.req.query('limit')  || '20'), 100);
    const offset = Math.max(parseInt(c.req.query('offset') || '0'),  0);

    const db = createDb(c.env);

    const [reviewsRes, statsRes] = await Promise.all([
      db.execute(sql`
        SELECT id, user_name, rating, comment, created_at
        FROM reviews WHERE product_id = ${productId}
        ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}
      `),
      db.execute(sql`
        SELECT ROUND(AVG(rating), 1) as avg_rating, COUNT(*) as review_count
        FROM reviews WHERE product_id = ${productId}
      `),
    ]);

    return c.json({
      success: true,
      reviews: reviewsRes.rows,
      stats: {
        avg_rating:   parseFloat((statsRes.rows[0] as any)?.avg_rating   || '0'),
        review_count: parseInt  ((statsRes.rows[0] as any)?.review_count || '0'),
      },
    });
  } catch (error) {
    console.error('getReviews error:', error);
    return c.json({ success: false, error: 'Failed to fetch reviews' }, 500);
  }
});

/**
 * POST /api/reviews
 */
app.post('/', telegramAuth, async (c) => {
  try {
    const userId = c.get('userId');
    const body   = await c.req.json();

    const schema = z.object({
      product_id: z.number().int().positive(),
      rating:     z.number().int().min(1).max(5),
      comment:    z.string().max(1000).optional().default(''),
    });

    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return c.json({ success: false, error: 'Valid product_id and rating (1-5) are required' }, 400);
    }

    const { product_id, rating, comment } = parsed.data;
    const db = createDb(c.env);

    // Already reviewed?
    const alreadyRes = await db.execute(sql`
      SELECT id FROM reviews
      WHERE user_id = ${userId} AND product_id = ${product_id}
      LIMIT 1
    `);
    if ((alreadyRes.rows as any[]).length > 0) {
      return c.json({ success: false, error: 'អ្នកបានវាយតម្លៃទំនិញនេះរួចហើយ។' }, 400);
    }

    // Verified purchaser?
    const purchaseRes = await db.execute(sql`
      SELECT id FROM orders
      WHERE user_id = ${userId}
        AND status IN ('paid','processing','shipped','delivered')
        AND items::text LIKE ${'%"id":' + product_id + '%'}
      LIMIT 1
    `);
    if (!(purchaseRes.rows as any[]).length) {
      return c.json({ success: false, error: 'អ្នកអាចវាយតម្លៃបាន លុះត្រាតែអ្នកធ្លាប់បានទិញទំនិញនេះ។' }, 403);
    }

    // Get display name
    const userRes = await db.execute(sql`
      SELECT user_name, username FROM users WHERE user_id = ${userId} LIMIT 1
    `);
    const userName: string =
      (userRes.rows[0] as any)?.user_name ||
      (userRes.rows[0] as any)?.username  ||
      'Customer';

    const insertRes = await db.execute(sql`
      INSERT INTO reviews (product_id, user_id, user_name, rating, comment)
      VALUES (${product_id}, ${userId}, ${userName}, ${rating}, ${comment})
      RETURNING *
    `);

    const statsRes = await db.execute(sql`
      SELECT ROUND(AVG(rating), 1) as avg_rating, COUNT(*) as review_count
      FROM reviews WHERE product_id = ${product_id}
    `);

    return c.json({
      success: true,
      review: insertRes.rows[0],
      stats: {
        avg_rating:   parseFloat((statsRes.rows[0] as any)?.avg_rating   || '0'),
        review_count: parseInt  ((statsRes.rows[0] as any)?.review_count || '0'),
      },
    });
  } catch (error) {
    console.error('createReview error:', error);
    return c.json({ success: false, error: 'Failed to submit review' }, 500);
  }
});

export default app;
