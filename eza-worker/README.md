# EZA-SHOP Cloudflare Worker API

Modern, fast, and scalable API for the EZA-SHOP Telegram Mini App built with:

- 🔥 **Hono.js** - Ultra-fast web framework for Cloudflare Workers
- 🐘 **Neon PostgreSQL** - Serverless PostgreSQL database
- 🗃️ **Drizzle ORM** - Type-safe database operations
- 🛡️ **Zod** - Runtime type validation
- 🔐 **Telegram Mini App Auth** - Secure authentication
- ⚡ **Edge Computing** - Global low-latency responses

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Setup Environment
Set up your secrets using Wrangler CLI:

```bash
# Database connection
wrangler secret put DATABASE_URL

# Telegram Bot
wrangler secret put BOT_TOKEN
wrangler secret put SUPERADMIN_ID

# Cloudinary (for images)
wrangler secret put CLOUDINARY_CLOUD_NAME
wrangler secret put CLOUDINARY_API_KEY  
wrangler secret put CLOUDINARY_API_SECRET

# Security
wrangler secret put SESSION_SECRET
```

### 3. Development
```bash
npm run dev
```

### 4. Deploy
```bash
# Staging
npm run deploy:staging

# Production
npm run deploy:prod
```

## 📊 API Endpoints

### Public Endpoints
- `GET /health` - Health check

### Products (Authentication Required)
- `GET /api/products` - Get all products
- `GET /api/products/:id` - Get single product
- `GET /api/products/category/:category` - Get products by category

### Orders (Authentication Required)
- `POST /api/orders` - Create new order
- `GET /api/orders` - Get user's orders
- `GET /api/orders/:orderCode` - Get specific order

### Admin (Admin Authentication Required)
- `GET /api/admin/dashboard` - Admin dashboard data
- `GET /api/admin/products` - Get all products (admin view)
- `PUT /api/admin/products/:id/stock` - Update product stock
- `GET /api/admin/orders` - Get all orders (admin view)
- `PUT /api/admin/orders/:id/status` - Update order status
- `GET /api/admin/settings` - Get system settings

## 🔐 Authentication

### Telegram Mini App Authentication
Send the Telegram init data in the header:
```
X-Telegram-Init-Data: query_id=...&user=...&auth_date=...&hash=...
```

### Development Bypass
For development, you can bypass authentication:
```
X-Debug-Bypass: true
```

### JWT Token Authentication
Alternatively, use JWT token:
```
Authorization: Bearer <jwt_token>
```

## 🗄️ Database Schema

The API uses the same PostgreSQL schema as your existing bot. Key tables:
- `products` - Product catalog
- `orders` - Customer orders
- `users` - User profiles
- `categories` - Product categories
- `settings` - System settings
- `coupons` - Discount coupons
- `wishlist` - User wishlists

## 📦 Request/Response Examples

### Create Order
```bash
POST /api/orders
X-Telegram-Init-Data: <telegram_init_data>
Content-Type: application/json

{
  "items": [
    {
      "id": 32,
      "name": "Product Name", 
      "price": 10.50,
      "quantity": 2
    }
  ],
  "phone": "012 345 678",
  "address": "Street Address",
  "province": "Phnom Penh",
  "delivery_company": "J&T Express",
  "note": "Optional note"
}
```

### Response
```json
{
  "success": true,
  "order": {
    "id": 123,
    "order_code": "EZA-ABC12345",
    "total": 23.00,
    "subtotal": 21.00,
    "delivery_fee": 2.00,
    "status": "pending",
    "expires_at": "2024-08-16T18:00:00.000Z"
  }
}
```

## 🌍 Deployment Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Mini App      │    │ Cloudflare      │    │ Neon PostgreSQL │
│   (Frontend)    │◄──►│ Workers (API)   │◄──►│   (Database)    │
│                 │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
       ▲                         ▲
       │                         │
       ▼                         ▼
┌─────────────────┐    ┌─────────────────┐
│ Telegram Bot    │    │ Cloudinary      │
│ (Notifications) │    │ (Images)        │
└─────────────────┘    └─────────────────┘
```

## 🔧 Development Tips

### Type Safety
All database operations are type-safe using Drizzle ORM and TypeScript.

### Environment Variables
- Use `wrangler secret` for sensitive data
- Use `wrangler.toml` vars for non-sensitive config

### Testing
```bash
npm test
```

### Database Migrations
If you need to modify the database schema:
```bash
npx drizzle-kit generate:pg
```

## 🚀 Performance Features

- **Edge Computing** - Deployed globally on Cloudflare's edge network
- **Serverless Database** - Neon PostgreSQL with connection pooling
- **Efficient Queries** - Optimized database queries with proper indexing
- **Response Caching** - Built-in Cloudflare caching for static responses
- **Lightweight Runtime** - Minimal cold start times with Hono.js

## 🛡️ Security Features

- **Telegram Authentication** - Cryptographic verification of Telegram init data
- **CORS Protection** - Proper cross-origin resource sharing configuration
- **Input Validation** - Request validation using Zod schemas
- **SQL Injection Protection** - Parameterized queries with Drizzle ORM
- **Admin Authorization** - Role-based access control

## 📈 Monitoring

Monitor your Worker performance in the Cloudflare dashboard:
- Request volume and errors
- Response times and cache hit rates
- Geographic distribution of requests
- Resource usage and costs

---

**Built for EZA-SHOP with ❤️ by Antigravity**