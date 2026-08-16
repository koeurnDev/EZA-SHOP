# Testing Guide / របៀបធ្វើតេស្ត

## Testing in Browser without Telegram / ធ្វើតេស្តក្នុង Browser ដោយគ្មាន Telegram

### Problem / បញ្ហា
នៅពេលដាក់ webapp នៅលើ production (Cloudflare Pages), backend worker ត្រូវការ Telegram authentication។ ប្រសិនបើអ្នកបើក webapp ក្នុង browser ធម្មតា (មិនមែនតាមរយៈ Telegram), requests នឹង fail ជាមួយ **401 Unauthorized**។

### Solution / ដំណោះស្រាយ

#### Option 1: Use Telegram Web App (Recommended)
សូមបើក webapp តាមរយៈ Telegram Bot ដើម្បីទទួលបាន authentication ស្វ័យប្រវត្តិ:

1. បើក Telegram Bot: `@Eza_Shop_Bot`
2. ចុច "បើក Shop" ឬ "Admin"
3. Webapp នឹងដំណើរការជាមួយ Telegram initData

#### Option 2: Local Development Testing
សម្រាប់ local testing នៅលើ `localhost`:

1. Run webapp locally:
   ```bash
   cd webapp
   npm run dev
   ```

2. បើក browser ទៅកាន់ `http://localhost:5173`
3. Code នឹងដាក់ `X-Debug-Bypass: true` header ស្វ័យប្រវត្តិ

#### Option 3: Production Testing with Test Token (Advanced)

**⚠️ WARNING: Only use for temporary testing. Remove TEST_TOKEN after testing!**

អ្នកអាចបន្ថែម test token នៅលើ production worker:

1. បង្កើត random test token:
   ```bash
   # On Linux/Mac:
   openssl rand -hex 32
   
   # Or use any random string:
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

2. បន្ថែម secret ទៅកាន់ Cloudflare Worker:
   ```bash
   cd eza-worker
   wrangler secret put TEST_TOKEN
   # Paste your generated token
   ```

3. នៅក្នុង browser console, set token ក្នុង localStorage:
   ```javascript
   localStorage.setItem('test_token', 'YOUR_GENERATED_TOKEN_HERE');
   ```

4. កែ `webapp/src/hooks/useApi.js` ដើម្បីបន្ថែម test token header:
   ```javascript
   // Add after line ~25:
   const testToken = typeof window !== 'undefined' ? localStorage.getItem('test_token') : null;
   
   // Update fetchOptions (around line 30):
   const fetchOptions = { 
     ...options, 
     headers: { 
       ...options?.headers,
       ...(isLocalDev && { 'X-Debug-Bypass': 'true' }),
       ...(testToken && { 'X-Test-Token': testToken })
     } 
   };
   ```

5. **IMPORTANT: Remove TEST_TOKEN from production after testing!**
   ```bash
   wrangler secret delete TEST_TOKEN
   ```

### How the Code Works / របៀបដែល Code ដំណើរការ

#### Development Mode (localhost)
```javascript
// webapp/src/hooks/useApi.js
const isLocalDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
// Automatically adds X-Debug-Bypass header
```

```typescript
// eza-worker/src/middleware/auth.ts
if (env.NODE_ENV === 'development' && bypass === 'true') {
  // Skip authentication
}
```

#### Production Mode (with Telegram)
```javascript
// webapp sends:
headers: { 'X-TG-Data': initData } // from Telegram WebApp
```

```typescript
// worker verifies:
const telegramData = await verifyTelegramAuth(initData, env.BOT_TOKEN);
```

### Debugging / ការជួសជុល

1. បើក Browser DevTools (F12)
2. ទៅកាន់ Network tab
3. រកមើល request ទៅកាន់ `eza-shop-api.koeurnseab630.workers.dev`
4. ពិនិត្យមើល Request Headers:
   - `X-TG-Data`: Telegram init data (នៅពេលបើកតាមរយៈ Telegram)
   - `X-Debug-Bypass`: true (នៅពេលបើកនៅ localhost)
   - `X-Test-Token`: your_token (នៅពេលប្រើ test token)

5. ពិនិត្យមើល Response:
   - 401 Unauthorized = missing/invalid auth
   - 500 Internal Error = server error (check worker logs)
   - 200 OK = success

### Security Notes / ចំណាំសុវត្ថិភាព

- **NEVER commit TEST_TOKEN to git**
- **Remove TEST_TOKEN from production after testing**
- **Only use test token for temporary debugging**
- **Always use Telegram authentication in production**

## Running Both Backend and Frontend Locally

### Backend (Worker)
```bash
cd eza-worker
cp .dev.vars.example .dev.vars
# Edit .dev.vars with your actual values
npm install
npm run dev  # Runs on http://localhost:8787
```

### Frontend (Webapp)
```bash
cd webapp
# Edit .env to point to local backend:
# VITE_BACKEND_URL=http://localhost:8787
npm install
npm run dev  # Runs on http://localhost:5173
```

ឥឡូវ backend និង frontend នឹងរត់នៅលើ local machine ហើយអាច communicate គ្នាបានដោយគ្មានបញ្ហា authentication!
