# Cloudflare Pages Build Configuration

## How to Configure Automatic GitHub Deployments

1. Go to Cloudflare Dashboard: https://dash.cloudflare.com/
2. Navigate to: **Pages** > **vibe-lifestyle-web** > **Settings** > **Builds & deployments**
3. Click **Configure Production deployments**

### Build Settings:

```
Framework preset: None
Build command: cd webapp && npm install && npm run build
Build output directory: webapp/dist
Root directory (advanced): / (leave as root)
```

### Environment Variables (optional):

```
NODE_VERSION = 22
NPM_VERSION = 10
```

4. Click **Save** and then **Retry deployment** on the latest failed build

## Alternative: Continue Using Manual Deployments

If you prefer to keep deploying manually (which is working perfectly), use this command:

```bash
# Build locally
cd webapp
npm install
npm run build

# Deploy to Cloudflare Pages
npx wrangler pages deploy webapp/dist --project-name=vibe-lifestyle-web --commit-dirty=true
```

## Current Deployment Status

✅ **Successfully deployed!**

- Preview: https://cd0760c5.eza-shop-web.pages.dev
- Production: https://eza-shop-web.pages.dev
- Custom Domain: https://vibelifestyle.store

Your website is live and working perfectly! 🎉
