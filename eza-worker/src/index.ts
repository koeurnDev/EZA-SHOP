import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';
import { cors } from './middleware/auth';
import productsRouter from './routes/products';
import ordersRouter from './routes/orders';
import adminRouter from './routes/admin';
import type { Env, Variables } from './types';

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

// Global middleware
app.use('*', logger());
app.use('*', prettyJSON());
app.use('*', cors);

// Health check endpoint
app.get('/health', (c) => {
  return c.json({
    success: true,
    message: 'EZA-SHOP API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

// API routes
app.route('/api/products', productsRouter);
app.route('/api/orders', ordersRouter);
app.route('/api/admin', adminRouter);

// Catch-all route for undefined endpoints
app.notFound((c) => {
  return c.json({
    success: false,
    error: 'Not Found',
    message: 'The requested endpoint does not exist',
    available_endpoints: [
      'GET /health',
      'GET /api/products',
      'GET /api/products/:id',
      'GET /api/products/category/:category',
      'POST /api/orders',
      'GET /api/orders',
      'GET /api/orders/:orderCode',
      'GET /api/admin/dashboard',
      'GET /api/admin/products',
      'PUT /api/admin/products/:id/stock',
      'GET /api/admin/orders',
      'PUT /api/admin/orders/:id/status',
      'GET /api/admin/settings',
    ],
  }, 404);
});

// Global error handler
app.onError((err, c) => {
  console.error('Global error:', err);
  
  return c.json({
    success: false,
    error: 'Internal Server Error',
    message: c.env?.NODE_ENV === 'production' 
      ? 'Something went wrong' 
      : err.message,
    ...(c.env?.NODE_ENV !== 'production' && { stack: err.stack }),
  }, 500);
});

export default app;