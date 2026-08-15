import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';
import { cors } from './middleware/auth';

import productsRouter      from './routes/products';
import ordersRouter        from './routes/orders';
import orderExtras         from './routes/orderExtras';
import adminRouter         from './routes/admin';
import adminExtras         from './routes/adminExtras';
import settingsRouter      from './routes/settings';
import userRouter          from './routes/user';
import wishlistRouter      from './routes/wishlist';
import reviewsRouter       from './routes/reviews';
import faqsRouter          from './routes/faqs';
import notificationsRouter from './routes/notifications';
import uploadRouter        from './routes/upload';

import type { Env, Variables } from './types';

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

// ── Global middleware ─────────────────────────────────────────────────────────
app.use('*', logger());
app.use('*', prettyJSON());
app.use('*', cors);

// ── Health ────────────────────────────────────────────────────────────────────
app.get('/health', (c) =>
  c.json({ success: true, message: 'EZA-SHOP API is running', timestamp: new Date().toISOString(), version: '2.0.0' })
);

// ── Settings / init / alive / ping ────────────────────────────────────────────
app.route('/api', settingsRouter);          // GET /api/alive, POST /api/ping, GET /api/settings, GET /api/init

// ── Products ──────────────────────────────────────────────────────────────────
app.route('/api/products', productsRouter); // also handles /:id/reviews via reviewsRouter below
app.route('/api/products', reviewsRouter);  // GET /api/products/:productId/reviews

// ── Orders ────────────────────────────────────────────────────────────────────
app.route('/api/orders', orderExtras);      // GET /status/:code, POST /validate-coupon, POST /receipt  ← MUST be before ordersRouter
app.route('/api/orders', ordersRouter);     // POST /, GET /, GET /:orderCode

// ── Reviews (POST) ────────────────────────────────────────────────────────────
app.route('/api/reviews', reviewsRouter);   // POST /api/reviews

// ── User ──────────────────────────────────────────────────────────────────────
app.route('/api/user', userRouter);         // GET/PUT /profile, GET /orders

// ── Wishlist ──────────────────────────────────────────────────────────────────
app.route('/api/wishlist', wishlistRouter); // GET /, POST /toggle

// ── FAQs ──────────────────────────────────────────────────────────────────────
app.route('/api/faqs', faqsRouter);

// ── Notifications ─────────────────────────────────────────────────────────────
app.route('/api/notifications', notificationsRouter);

// ── Upload ────────────────────────────────────────────────────────────────────
app.route('/api/upload', uploadRouter);

// ── Admin ─────────────────────────────────────────────────────────────────────
app.route('/api/admin', adminRouter);
app.route('/api/admin', adminExtras);

// ── 404 ───────────────────────────────────────────────────────────────────────
app.notFound((c) =>
  c.json({ success: false, error: 'Not Found' }, 404)
);

// ── Global error handler ──────────────────────────────────────────────────────
app.onError((err, c) => {
  console.error('Unhandled error:', err);
  return c.json({
    success: false,
    error: 'Internal Server Error',
    message: c.env?.NODE_ENV === 'production' ? 'Something went wrong' : err.message,
  }, 500);
});

export default app;
