# Deploy Worker Updates / ដាក់ការកែប្រែចេញផ្សាយ

## Quick Deploy to Production

```bash
cd eza-worker
npm run deploy
```

## Check Worker Logs

```bash
wrangler tail
```

## View Production Worker URL

Your worker is deployed at:
- **Production:** `https://eza-shop-api.koeurnseab630.workers.dev`

## After Deploy - Verify

1. Open browser
2. Go to: `https://eza-shop-api.koeurnseab630.workers.dev/health`
3. You should see:
```json
{
  "success": true,
  "message": "EZA-SHOP API is running",
  "timestamp": "2026-08-16T...",
  "version": "2.0.0"
}
```

## What Changed / អ្វីដែលបានផ្លាស់ប្តូរ

### ✅ Fixed Backend-Frontend Connection Issue

**Before:** Backend checked if BACKEND_URL contained "localhost"  
**After:** Backend checks where the webapp is actually running (window.location.hostname)

This fixes the issue where webapp on Cloudflare Pages couldn't connect to production backend.

### ✅ Added Test Token Support (Optional)

For advanced testing, you can now set TEST_TOKEN secret:
```bash
wrangler secret put TEST_TOKEN
```

### ✅ Updated CORS Headers

Added `X-Test-Token` to allowed headers in CORS middleware.

## Deploy Checklist

- [ ] Worker code updated (auth.ts)
- [ ] Run `npm run deploy`
- [ ] Check `/health` endpoint
- [ ] Test upload functionality in admin panel (via Telegram)
- [ ] Verify logs with `wrangler tail`

## Rollback if Needed

If something breaks, you can rollback:

```bash
# View recent deployments
wrangler deployments list

# Rollback to specific version
wrangler rollback <deployment-id>
```

## Environment Variables

Make sure these secrets are set:
```bash
wrangler secret list
```

Required secrets:
- DATABASE_URL
- BOT_TOKEN
- SUPERADMIN_ID
- SESSION_SECRET
- CLOUDINARY_CLOUD_NAME
- CLOUDINARY_API_KEY
- CLOUDINARY_API_SECRET

Optional (for testing):
- TEST_TOKEN
