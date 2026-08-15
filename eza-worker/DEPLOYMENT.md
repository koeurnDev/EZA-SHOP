# EZA-SHOP Cloudflare Worker Deployment Guide

## 📋 Prerequisites

1. **Cloudflare Account** - Sign up at [cloudflare.com](https://cloudflare.com)
2. **Neon Database** - Your existing PostgreSQL database
3. **Telegram Bot** - Your existing bot token
4. **Node.js** - Version 18+ installed

## 🚀 Step-by-Step Deployment

### 1. Authenticate with Cloudflare

```bash
cd eza-worker
npx wrangler login
```

This will open your browser to authenticate with Cloudflare.

### 2. Set Environment Variables

Set up your secrets using Wrangler CLI:

```bash
# Required secrets
npx wrangler secret put DATABASE_URL
# Enter your Neon PostgreSQL connection string

npx wrangler secret put BOT_TOKEN  
# Enter your Telegram bot token

npx wrangler secret put SUPERADMIN_ID
# Enter your Telegram user ID

npx wrangler secret put SESSION_SECRET
# Enter a strong random string (32+ characters)

# Optional (for image uploads)
npx wrangler secret put CLOUDINARY_CLOUD_NAME
npx wrangler secret put CLOUDINARY_API_KEY
npx wrangler secret put CLOUDINARY_API_SECRET
```

### 3. Deploy to Cloudflare Workers

```bash
# Deploy to development
npm run deploy

# Deploy to staging
npm run deploy:staging

# Deploy to production  
npm run deploy:prod
```

### 4. Test Your Deployment

After deployment, you'll get a URL like: `https://eza-shop-api.your-subdomain.workers.dev`

Test the endpoints:

```bash
# Health check
curl https://eza-shop-api.your-subdomain.workers.dev/health

# Products (requires authentication)
curl -H "X-Debug-Bypass: true" https://eza-shop-api.your-subdomain.workers.dev/api/products
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | Neon PostgreSQL connection string | ✅ |
| `BOT_TOKEN` | Telegram Bot Token | ✅ |
| `SUPERADMIN_ID` | Your Telegram User ID | ✅ |
| `SESSION_SECRET` | JWT signing secret | ✅ |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name | ❌ |
| `CLOUDINARY_API_KEY` | Cloudinary API key | ❌ |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret | ❌ |

### Development Mode

For development/testing, you can bypass Telegram authentication:

```bash
curl -H "X-Debug-Bypass: true" -H "Content-Type: application/json" \
  https://your-worker.workers.dev/api/products
```

## 📊 Monitoring

### Cloudflare Dashboard
- Monitor requests, errors, and performance
- View analytics and usage metrics
- Set up alerts for errors or high traffic

### Worker Logs
```bash
npx wrangler tail
```

## 🔄 Updates

To update your Worker after making changes:

```bash
# Test locally first
npm run type-check

# Deploy the changes
npm run deploy
```

## 🛠️ Troubleshooting

### Common Issues

1. **"Failed to publish" error**
   - Check your Cloudflare authentication: `npx wrangler whoami`
   - Verify your account has Workers enabled

2. **Database connection errors**
   - Verify your `DATABASE_URL` is correct
   - Check if your Neon database is accessible
   - Ensure the connection string includes `sslmode=require`

3. **Authentication failures**
   - Verify `BOT_TOKEN` is set correctly
   - Check `SUPERADMIN_ID` matches your Telegram user ID
   - Ensure `SESSION_SECRET` is set and long enough

4. **TypeScript errors**
   - Run `npm run type-check` to identify issues
   - Check all imports and types

### Environment-Specific Issues

**Development:**
- Use `X-Debug-Bypass: true` header to skip auth
- Check console for detailed error messages

**Production:**
- Remove debug headers
- Use proper Telegram authentication
- Monitor Cloudflare dashboard for errors

## 📈 Performance Optimization

1. **Database Queries**
   - Queries are automatically optimized with connection pooling
   - Neon handles scaling automatically

2. **Global Edge Network**
   - Your API is deployed globally on Cloudflare's edge
   - Users get responses from the nearest data center

3. **Caching**
   - Cloudflare automatically caches static responses
   - Database responses can be cached in your application logic

## 🔐 Security

1. **Authentication**
   - Telegram Mini App authentication is cryptographically verified
   - Admin endpoints require proper authorization

2. **CORS**
   - Configured for secure cross-origin requests
   - Proper headers for Mini App integration

3. **Input Validation**
   - All inputs are validated using Zod schemas
   - SQL injection protection via Drizzle ORM

## 🌐 Integration

### Update Your Telegram Mini App

Update your frontend to use the new API:

```javascript
const API_BASE = 'https://eza-shop-api.your-subdomain.workers.dev';

// Get products
const response = await fetch(`${API_BASE}/api/products`, {
  headers: {
    'X-Telegram-Init-Data': window.Telegram.WebApp.initData
  }
});
```

### Update Your Bot

You can keep using your existing bot server, or gradually migrate endpoints to the Worker.

---

**Need help?** Check the logs with `npx wrangler tail` or review the Cloudflare Workers documentation.